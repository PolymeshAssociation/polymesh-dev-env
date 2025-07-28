import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import { ClaimType, InstructionStatus } from '@polymeshassociation/polymesh-sdk/types';

import { assertTagPresent } from '~/assertions';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams } from '~/rest/assets/params';
import { createClaimParams } from '~/rest/claims/params';
import { ProcessMode, TxBase } from '~/rest/common';
import { blockedIdentityRequirements, complianceRequirementsParams } from '~/rest/compliance';
import { Identity } from '~/rest/identities/interfaces';
import { fungibleInstructionParams, venueParams } from '~/rest/settlements/params';
import { awaitMiddlewareSyncedForRestApi } from '~/util';

const handles = ['issuer', 'blocked', 'investor'];
let factory: TestFactory;

describe('Compliance Requirements for Fungible Assets', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let blocked: Identity;
  let investor: Identity;
  let assetId: string;
  let signerTxBase: TxBase;
  let investorTxBase: TxBase;
  let blockedTxBase: TxBase;
  let venueId: string;
  let blockedBalance = 0;
  let investorBalance = 0;
  let investorInstructionId: string;
  let blockedInstructionId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    blocked = factory.getSignerIdentity(handles[1]);
    investor = factory.getSignerIdentity(handles[2]);

    signer = issuer.signer;
    signerTxBase = { options: { signer, processMode: ProcessMode.Submit } };
    investorTxBase = {
      options: { signer: investor.signer, processMode: ProcessMode.Submit },
    };
    blockedTxBase = {
      options: { signer: blocked.signer, processMode: ProcessMode.Submit },
    };

    assetId = await restClient.assets.createAndGetAssetId(createAssetParams(signerTxBase));
    const venueData = await restClient.settlements.createVenue(venueParams(signerTxBase));
    ({ venue: venueId } = venueData as { venue: string });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should be able to create an instruction when no compliance rules exist', async () => {
    const investorInstruction = await restClient.settlements.createInstruction(
      venueId,
      fungibleInstructionParams(assetId, issuer.did, investor.did, signerTxBase)
    );
    const blockedReceiverInstruction = await restClient.settlements.createInstruction(
      venueId,
      fungibleInstructionParams(assetId, issuer.did, blocked.did, signerTxBase)
    );

    expect(investorInstruction).toEqual(
      assertTagPresent(expect, 'settlement.addAndAffirmWithMediators')
    );
    expect(blockedReceiverInstruction).toEqual(
      assertTagPresent(expect, 'settlement.addAndAffirmWithMediators')
    );
  });

  it('should be able to affirm an instruction when no compliance rules exist', async () => {
    blockedBalance += 10;
    investorBalance += 10;

    const { results: investorsPendingInstructions } =
      await restClient.identities.getPendingInstructions(investor.did);

    const investorPendingInstructionId = investorsPendingInstructions[0];

    expect(investorPendingInstructionId).not.toBeUndefined();

    const investorAffirmResult = await restClient.settlements.affirmInstruction(
      investorPendingInstructionId,
      investorTxBase
    );

    expect(investorAffirmResult).toEqual(
      assertTagPresent(expect, 'settlement.affirmInstructionWithCount')
    );

    const { results: blockedPendingInstructions } =
      await restClient.identities.getPendingInstructions(blocked.did);

    const blockedPendingInstructionId = blockedPendingInstructions[0];

    expect(blockedPendingInstructionId).not.toBeUndefined();

    const blockedAffirmResult = await restClient.settlements.affirmInstruction(
      blockedPendingInstructionId,
      blockedTxBase
    );

    expect(blockedAffirmResult).toEqual(
      assertTagPresent(expect, 'settlement.affirmInstructionWithCount')
    );
  });

  it('should have transferred the asset to both receivers', async () => {
    const investorPortfolio = await restClient.portfolios.getPortfolio(investor.did, '0');

    expect(investorPortfolio).toEqual(
      expect.objectContaining({
        assetBalances: expect.arrayContaining([
          expect.objectContaining({
            asset: assetId,
            free: investorBalance.toString(),
          }),
        ]),
      })
    );

    const blockedDidPortfolio = await restClient.portfolios.getPortfolio(blocked.did, '0');

    expect(blockedDidPortfolio).toEqual(
      expect.objectContaining({
        assetBalances: expect.arrayContaining([
          expect.objectContaining({
            asset: assetId,
            free: blockedBalance.toString(),
          }),
        ]),
      })
    );
  });

  it('should be able to create compliance requirements for trading', async () => {
    const params = complianceRequirementsParams(
      [blockedIdentityRequirements(assetId, issuer.did)],
      signerTxBase
    );
    const txData = await restClient.compliance.setRequirements(assetId, params);

    expect(txData).toEqual(assertTagPresent(expect, 'complianceManager.replaceAssetCompliance'));

    const requirements = await restClient.compliance.getComplianceRequirements(assetId);

    expect(requirements).toMatchObject({
      requirements: expect.arrayContaining([
        expect.objectContaining({ conditions: params.requirements[0] }),
      ]),
    });
  });

  it('should be able to block an identity', async () => {
    const claimParams = createClaimParams({
      signer,
      dryRun: false,
      claims: [
        {
          target: blocked.did,
          claim: {
            type: ClaimType.Blocked,
            scope: {
              type: 'Asset',
              value: assetId,
            },
          },
        },
      ],
    });
    const txData = await restClient.claims.addClaim(claimParams);

    expect(txData).toEqual(assertTagPresent(expect, 'identity.addClaim'));
  });

  it('should be able to create instruction for investor and blocked receiver', async () => {
    investorBalance += 10;

    const investorInstruction = await restClient.settlements.createInstruction(
      venueId,
      fungibleInstructionParams(assetId, issuer.did, investor.did, signerTxBase)
    );

    const blockedReceiverInstruction = await restClient.settlements.createInstruction(
      venueId,
      fungibleInstructionParams(assetId, issuer.did, blocked.did, {
        options: { signer: issuer.signer, processMode: ProcessMode.Submit },
      })
    );

    expect(investorInstruction).toEqual(
      assertTagPresent(expect, 'settlement.addAndAffirmWithMediators')
    );

    expect(blockedReceiverInstruction).toEqual(
      assertTagPresent(expect, 'settlement.addAndAffirmWithMediators')
    );
  });

  it('should be able to call affirm on instruction for both receivers', async () => {
    const { results: investorsPendingInstructions } =
      await restClient.identities.getPendingInstructions(investor.did);

    investorInstructionId = investorsPendingInstructions[0];

    expect(investorInstructionId).not.toBeUndefined();

    const investorAffirmResult = await restClient.settlements.affirmInstruction(
      investorInstructionId,
      investorTxBase
    );

    expect(investorAffirmResult).toEqual(
      assertTagPresent(expect, 'settlement.affirmInstructionWithCount')
    );

    const { results: blockedPendingInstructions } =
      await restClient.identities.getPendingInstructions(blocked.did);

    blockedInstructionId = blockedPendingInstructions[0];

    expect(blockedInstructionId).not.toBeUndefined();

    const blockedAffirmResult = await restClient.settlements.affirmInstruction(
      blockedInstructionId,
      blockedTxBase
    );

    expect(blockedAffirmResult).toEqual(
      assertTagPresent(expect, 'settlement.affirmInstructionWithCount')
    );

    // we add buffer of 1 block so that middleware can wait until InstructionExecuted event is processed ( which is done on next block where affirmations are received)
    await awaitMiddlewareSyncedForRestApi(investorAffirmResult, restClient, new BigNumber(1));
    // we add buffer of 1 block so that middleware can wait until FailedToExecuteInstruction event is processed ( which is done on next block where affirmations are received)
    await awaitMiddlewareSyncedForRestApi(blockedAffirmResult, restClient, new BigNumber(1));
  });

  it('should have transferred asset to investor', async () => {
    const investorPortfolio = await restClient.portfolios.getPortfolio(investor.did, '0');

    expect(investorPortfolio).toEqual(
      expect.objectContaining({
        assetBalances: expect.arrayContaining([
          expect.objectContaining({
            asset: assetId,
            free: investorBalance.toString(),
          }),
        ]),
      })
    );
  });

  it('should have not transferred the asset to a blocked receiver', async () => {
    const blockedDidPortfolio = await restClient.portfolios.getPortfolio(blocked.did, '0');

    expect(blockedDidPortfolio).toEqual(
      expect.objectContaining({
        assetBalances: expect.arrayContaining([
          expect.objectContaining({
            asset: assetId,
            free: blockedBalance.toString(),
          }),
        ]),
      })
    );
  });

  it('should have affirmed the instruction for investor', async () => {
    const instruction = await restClient.settlements.getInstruction(investorInstructionId);

    expect(instruction).toEqual(
      expect.objectContaining({
        status: InstructionStatus.Success,
      })
    );
  });

  it('should have failed the instruction for blocked did', async () => {
    const instruction = await restClient.settlements.getInstruction(blockedInstructionId);

    expect(instruction).toEqual(
      expect.objectContaining({
        status: InstructionStatus.Failed,
      })
    );
  });

  it('should be possible to send an asset to a blocked did after pausing compliance requirements', async () => {
    const txData = await restClient.compliance.pauseRequirements(assetId, signerTxBase);

    expect(txData).toEqual(assertTagPresent(expect, 'complianceManager.pauseAssetCompliance'));

    const blockedReceiverInstruction = await restClient.settlements.createInstruction(
      venueId,
      fungibleInstructionParams(assetId, issuer.did, blocked.did, {
        options: { signer: issuer.signer, processMode: ProcessMode.Submit },
      })
    );

    expect(blockedReceiverInstruction).toEqual(
      assertTagPresent(expect, 'settlement.addAndAffirmWithMediators')
    );

    blockedBalance += 10;

    const { results: blockedPendingInstructions } =
      await restClient.identities.getPendingInstructions(blocked.did);

    blockedInstructionId = blockedPendingInstructions[0];

    expect(blockedInstructionId).not.toBeUndefined();

    const blockedAffirmResult = await restClient.settlements.affirmInstruction(
      blockedInstructionId,
      blockedTxBase
    );

    expect(blockedAffirmResult).toEqual(
      assertTagPresent(expect, 'settlement.affirmInstructionWithCount')
    );

    const blockedDidPortfolio = await restClient.portfolios.getPortfolio(blocked.did, '0');

    expect(blockedDidPortfolio).toEqual(
      expect.objectContaining({
        assetBalances: expect.arrayContaining([
          expect.objectContaining({
            asset: assetId,
            free: blockedBalance.toString(),
          }),
        ]),
      })
    );
  });
});
