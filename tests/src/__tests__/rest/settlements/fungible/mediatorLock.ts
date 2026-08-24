import { BigNumber } from '@polymeshassociation/polymesh-sdk';

import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams } from '~/rest/assets/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestSuccessResult } from '~/rest/interfaces';
import { fungibleInstructionParams, venueParams } from '~/rest/settlements/params';
import { awaitMiddlewareSyncedForRestApi, isAlreadyAffirmedError } from '~/util';

const handles = ['issuer', 'investor', 'mediator'];
let factory: TestFactory;

/*
  An Instruction of type `SettleAfterLock` is held by a mediator until they lock it for
  execution. This exercises the full lock/relock cycle through the REST API: create with
  `endAfterLock`, affirm as every party (including the mediator), lock, inspect the leg and
  relock status, then unlock and confirm the relock cooldown window populates.
*/
describe('Settlements - REST API (SettleAfterLock Instructions)', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let investor: Identity;
  let mediator: Identity;
  let venueId: string;
  let assetId: string;
  let instructionId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    investor = factory.getSignerIdentity(handles[1]);
    mediator = factory.getSignerIdentity(handles[2]);

    signer = issuer.signer;

    const assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    assetId = await restClient.assets.createAndGetAssetId(assetParams);

    const venueTx = await restClient.settlements.createVenue(
      venueParams({
        options: { processMode: ProcessMode.Submit, signer },
      })
    );
    venueId = (venueTx as RestSuccessResult).venue as string;
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should report no signers on a freshly created Venue', async () => {
    const [{ results: signers }, { count }] = await Promise.all([
      restClient.settlements.getVenueSigners(venueId),
      restClient.settlements.getVenueSignerCount(venueId),
    ]);

    expect(signers).toEqual([]);
    expect(count).toBe('0');
  });

  it('should add and remove an allowed Venue signer', async () => {
    const signerAddress = investor.primaryAccount.account.address;

    const addTx = await restClient.settlements.addVenueSigners(venueId, {
      signers: [signerAddress],
      options: { processMode: ProcessMode.Submit, signer },
    });
    expect(addTx).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'settlement.updateVenueSigners',
          ...expectBasicTxInfo,
        }),
      ]),
    });

    const { count: countAfterAdd } = await restClient.settlements.getVenueSignerCount(venueId);
    expect(countAfterAdd).toBe('1');

    const removeTx = await restClient.settlements.removeVenueSigners(venueId, {
      signers: [signerAddress],
      options: { processMode: ProcessMode.Submit, signer },
    });
    expect(removeTx).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'settlement.updateVenueSigners',
          ...expectBasicTxInfo,
        }),
      ]),
    });

    const { count: countAfterRemove } = await restClient.settlements.getVenueSignerCount(venueId);
    expect(countAfterRemove).toBe('0');
  });

  it('should create a SettleAfterLock instruction with a mediator', async () => {
    const params = fungibleInstructionParams(
      assetId,
      issuer.did,
      investor.did,
      {
        options: { processMode: ProcessMode.Submit, signer },
      },
      {
        mediators: [mediator.did],
        endAfterLock: true,
      }
    );

    const instructionData = await restClient.settlements.createInstruction(venueId, params);

    expect(instructionData).toMatchObject({
      instruction: expect.any(String),
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.addAndAffirmWithMediators',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });

    instructionId = (instructionData as RestSuccessResult).instruction as string;

    await awaitMiddlewareSyncedForRestApi(
      instructionData as RestSuccessResult,
      restClient,
      new BigNumber(1)
    );

    const details = await restClient.settlements.getInstruction(instructionId);
    expect(details).toMatchObject({ type: 'SettleAfterLock', status: 'Pending' });
  });

  it('should be affirmed by every party including the mediator', async () => {
    // A receiver without mandatory affirmation opted in is auto-affirmed on creation, so this
    // is only needed when the Instruction is still pending the investor's affirmation.
    const affirmResult = await restClient.settlements.affirmInstruction(instructionId, {
      options: { processMode: ProcessMode.Submit, signer: investor.signer },
    });
    if (!isAlreadyAffirmedError(affirmResult)) {
      expect(affirmResult).toMatchObject({
        transactions: expect.arrayContaining([
          expect.objectContaining({
            transactionTag: 'settlement.affirmInstructionWithCount',
            ...expectBasicTxInfo,
          }),
        ]),
      });
    }

    const affirmAsMediatorResult = await restClient.settlements.affirmInstructionAsMediator(
      instructionId,
      undefined,
      {
        options: { processMode: ProcessMode.Submit, signer: mediator.signer },
      }
    );
    expect(affirmAsMediatorResult).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'settlement.affirmInstructionAsMediator',
          ...expectBasicTxInfo,
        }),
      ]),
    });

    await awaitMiddlewareSyncedForRestApi(
      affirmAsMediatorResult as RestSuccessResult,
      restClient
    );
  });

  it('should not be locked before the mediator locks it', async () => {
    const relockStatus = await restClient.settlements.getRelockStatus(instructionId);

    expect(relockStatus).toMatchObject({
      unlockedAt: null,
      relockCount: '0',
    });
  });

  it('should be locked for execution by the mediator', async () => {
    const lockTx = await restClient.settlements.lockInstructionForExecution(instructionId, {
      options: { processMode: ProcessMode.Submit, signer: mediator.signer },
    });

    expect(lockTx).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'settlement.lockInstruction',
          ...expectBasicTxInfo,
        }),
      ]),
    });

    await awaitMiddlewareSyncedForRestApi(
      lockTx as RestSuccessResult,
      restClient,
      new BigNumber(1)
    );

    const details = await restClient.settlements.getInstruction(instructionId);
    expect(details).toMatchObject({ status: 'LockedForExecution' });
  });

  it('should report a status for the leg', async () => {
    const legStatus = await restClient.settlements.getLegStatus(instructionId, '0');

    expect(legStatus).toEqual(
      expect.objectContaining({
        type: expect.any(String),
      })
    );
  });

  it('should be unlocked by the mediator, starting the relock cooldown', async () => {
    const unlockTx = await restClient.settlements.unlockInstructionForExecution(instructionId, {
      options: { processMode: ProcessMode.Submit, signer: mediator.signer },
    });

    expect(unlockTx).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'settlement.unlockInstruction',
          ...expectBasicTxInfo,
        }),
      ]),
    });

    const relockStatus = await restClient.settlements.getRelockStatus(instructionId);
    expect(relockStatus.unlockedAt).toEqual(expect.any(String));
    expect(relockStatus.cooldownEndsAt).toEqual(expect.any(String));
    expect(Number(relockStatus.maxRelockCount)).toBeGreaterThanOrEqual(
      Number(relockStatus.relockCount)
    );

    await awaitMiddlewareSyncedForRestApi(
      unlockTx as RestSuccessResult,
      restClient,
      new BigNumber(1)
    );

    const details = await restClient.settlements.getInstruction(instructionId);
    expect(details).toMatchObject({ status: 'Pending' });
  });
});
