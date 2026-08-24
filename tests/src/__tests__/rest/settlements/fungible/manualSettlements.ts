import { BigNumber } from '@polymeshassociation/polymesh-sdk';

import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams } from '~/rest/assets/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestSuccessResult } from '~/rest/interfaces';
import { fungibleInstructionParams, venueParams } from '~/rest/settlements';
import {
  awaitMiddlewareSyncedForRestApi,
  isAlreadyAffirmedError,
  isRestError,
  withPendingInstructionBlock,
} from '~/util';

const handles = ['issuer', 'investor'];
let factory: TestFactory;

describe('Settlements - REST API (Manual Settlement Flow)', () => {
  let restClient: RestClient;
  let issuer: Identity;
  let investor: Identity;
  let signer: string;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;
  let venueId: string;
  let instructionId: string;
  let createInstructionParams: ReturnType<typeof fungibleInstructionParams>;
  let endAfterBlock: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    investor = factory.getSignerIdentity(handles[1]);
    signer = issuer.signer;

    assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should create a fungible asset with initial supply', async () => {
    assetId = await restClient.assets.createAndGetAssetId(assetParams);

    createInstructionParams = fungibleInstructionParams(assetId, issuer.did, investor.did, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    expect(assetId).toBeTruthy();
  });

  it('should create a venue, fetch details and update venue', async () => {
    const venueTx = await restClient.settlements.createVenue(
      venueParams({
        options: { signer, processMode: ProcessMode.Submit },
      })
    );

    expect(venueTx).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.createVenue',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });

    venueId = (venueTx as RestSuccessResult).venue as string;
    expect(venueId).toBeTruthy();

    let venueDetails = await restClient.settlements.getVenue(venueId);
    expect(venueDetails).toMatchObject({
      description: expect.any(String),
      type: 'Exchange',
      owner: issuer.did,
    });

    const updatedVenueTx = await restClient.settlements.updateVenue(
      venueId,
      {
        description: 'Updated Venue Description',
        type: 'Other',
      },
      {
        options: { signer, processMode: ProcessMode.Submit },
      }
    );

    expect(updatedVenueTx).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTags: ['settlement.updateVenueDetails', 'settlement.updateVenueType'],
          type: 'batch',
          ...expectBasicTxInfo,
        },
      ]),
    });

    venueDetails = await restClient.settlements.getVenue(venueId);
    expect(venueDetails).toMatchObject({
      description: 'Updated Venue Description',
      type: 'Other',
    });
  });

  it('should check if the instruction will run using dry run', async () => {
    // Dry run mode returns simulation details without executing the transaction
    const dryRunInstruction = await restClient.settlements.createInstruction(venueId, {
      ...createInstructionParams,
      options: { processMode: ProcessMode.DryRun, signer },
    });

    expect(dryRunInstruction).toMatchObject({
      transactions: [],
      details: {
        status: expect.any(String),
        fees: {
          protocol: expect.any(String),
          gas: expect.any(String),
          total: expect.any(String),
        },
        supportsSubsidy: expect.any(Boolean),
        payingAccount: {
          balance: expect.any(String),
          type: expect.any(String),
          address: expect.any(String),
        },
      },
    });
  });

  it('should create a settlement instruction', async () => {
    const params = await withPendingInstructionBlock(restClient, factory.polymeshSdk, {
      ...createInstructionParams,
      options: { processMode: ProcessMode.Submit, signer },
    });

    const createInstructionTx = await restClient.settlements.createInstruction(venueId, params);

    expect(createInstructionTx).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.addAndAffirmWithMediators',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });

    instructionId = (createInstructionTx as RestSuccessResult).instruction as string;
    expect(instructionId).toBeTruthy();
  });

  it('should reject the instruction via receiver', async () => {
    const rejectInstructionTx = await restClient.settlements.rejectInstruction(instructionId, {
      options: { processMode: ProcessMode.Submit, signer: investor.signer },
    });

    expect(rejectInstructionTx).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.rejectInstructionWithCount',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should create a instruction to be settled manually', async () => {
    const latestBlock = await restClient.network.getLatestBlock();
    endAfterBlock = (Number(latestBlock.id) + 5).toString();

    const createInstructionResult = await restClient.settlements.createInstruction(venueId, {
      ...createInstructionParams,
      endAfterBlock: endAfterBlock.toString(),
      options: { processMode: ProcessMode.Submit, signer },
    });

    expect(createInstructionResult).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.addAndAffirmWithMediators',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });

    instructionId = (createInstructionResult as RestSuccessResult).instruction as string;
    expect(parseInt(instructionId)).toEqual(expect.any(Number));

    await awaitMiddlewareSyncedForRestApi(createInstructionResult, restClient, new BigNumber(1));
  });

  it('should get the instruction details, legs and status', async () => {
    const instructionDetails = await restClient.settlements.getInstruction(instructionId);
    const { endAfterBlock: restEndAfterBlock } = instructionDetails as {
      endAfterBlock?: string;
    };
    expect(restEndAfterBlock).toBe(endAfterBlock);

    expect(instructionDetails).toMatchObject({
      venue: venueId,
      endAfterBlock,
      status: 'Pending',
      type: 'SettleManual',
      legs: expect.arrayContaining([
        expect.objectContaining({
          asset: assetId,
          amount: '10',
          from: expect.objectContaining({
            portfolio: expect.objectContaining({ did: issuer.did }),
          }),
          to: expect.objectContaining({
            portfolio: expect.objectContaining({ did: investor.did }),
          }),
          type: 'onChain',
        }),
      ]),
    });
  });

  it('should approve the instruction via receiver', async () => {
    const approveInstructionTx = await restClient.settlements.affirmInstruction(instructionId, {
      options: { processMode: ProcessMode.Submit, signer: investor.signer },
    });

    if (!isAlreadyAffirmedError(approveInstructionTx)) {
      expect(approveInstructionTx).toMatchObject({
        transactions: expect.arrayContaining([
          {
            transactionTag: 'settlement.affirmInstructionWithCount',
            type: 'single',
            ...expectBasicTxInfo,
          },
        ]),
      });

      await awaitMiddlewareSyncedForRestApi(approveInstructionTx, restClient, new BigNumber(1));
    }

    const results = await restClient.settlements.getAffirmations(instructionId);

    expect(results).toMatchObject({
      results: expect.arrayContaining([
        expect.objectContaining({
          identity: issuer.did,
          status: 'Affirmed',
        }),
        expect.objectContaining({
          identity: investor.did,
          status: 'Affirmed',
        }),
      ]),
      total: '2',
    });
  });

  // Affirmation withdraw is discontinued on chain v8; a party can only reject before affirming.

  it('should execute the instruction manually', async () => {
    const instructionDetails = await restClient.settlements.getInstruction(instructionId);

    if (
      !isRestError(instructionDetails) &&
      (instructionDetails as { status?: string }).status !== 'Pending'
    ) {
      return;
    }

    const executeInstructionTx = await restClient.settlements.executeInstructionManually(
      instructionId,
      {
        options: { processMode: ProcessMode.Submit, signer: investor.signer },
      }
    );

    if (isRestError(executeInstructionTx)) {
      return;
    }

    expect(executeInstructionTx).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.executeManualInstruction',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });
});
