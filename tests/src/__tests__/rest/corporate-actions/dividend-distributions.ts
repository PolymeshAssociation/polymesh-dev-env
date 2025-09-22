import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams } from '~/rest/assets/params';
import { ProcessMode } from '~/rest/common';
import {
  claimDividendDistributionParams,
  createDividendDistributionParams,
  modifyDistributionCheckpointParams,
  payDividendDistributionParams,
  reclaimDividendDistributionParams,
} from '~/rest/corporate-actions/params';
import { Identity } from '~/rest/identities/interfaces';
import { RestSuccessResult } from '~/rest/interfaces';
import { fungibleInstructionParams } from '~/rest/settlements/params';

import { expectBasicTxInfo } from '../utils';

const handles = ['issuer', 'holder'];
let factory: TestFactory;

describe('Dividend Distributions', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let holder: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;
  let distributionId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    holder = factory.getSignerIdentity(handles[1]);
    signer = issuer.signer;

    assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should create and fetch the Asset', async () => {
    assetId = await restClient.assets.createAndGetAssetId(assetParams);
  });

  it('should transfer part of the Asset to the holder', async () => {
    const params = fungibleInstructionParams(assetId, issuer.did, holder.did, {
      options: { processMode: ProcessMode.Submit, signer },
    });
    const txData = await restClient.settlements.createDirectInstruction(params);
    expect((txData as RestSuccessResult).instruction).toBeDefined();

    const affirmTxData = await restClient.settlements.affirmInstruction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (txData as any).instruction,
      { options: { processMode: ProcessMode.Submit, signer: holder.signer } }
    );

    expect(affirmTxData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.affirmInstructionWithCount',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should have no dividend distributions', async () => {
    const distributions = await restClient.corporateActions.getDividendDistributions(assetId);

    expect(distributions.results.length).toEqual(0);
  });

  it('should create a dividend distribution', async () => {
    const params = createDividendDistributionParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    const result = await restClient.corporateActions.configureDividendDistribution(assetId, params);
    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'corporateAction.configureDividendDistribution',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
    expect(result.dividendDistribution).toBeDefined();
    expect(result.dividendDistribution.id).toBeDefined();
    distributionId = result.dividendDistribution.id as string;
  });

  it('should fetch the dividend distribution', async () => {
    const result = await restClient.corporateActions.getDividendDistribution(
      assetId,
      distributionId
    );
    expect(result).toBeDefined();
    expect(result.id).toBe(distributionId);
    expect(result.asset).toBe(assetId);
  });

  it('should pay the dividend distribution', async () => {
    const params = payDividendDistributionParams(
      {
        options: { processMode: ProcessMode.Submit, signer },
      },
      undefined,
      [holder.did]
    );
    const result = await restClient.corporateActions.payDividendDistribution(
      assetId,
      distributionId,
      params
    );
    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'corporateAction.payDividendDistribution',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('holder should be able to get pending distributions', async () => {
    const distributions = await restClient.identities.pendingDividendDistributions(holder.did);
    expect(distributions.results.length).toEqual(1);
    expect(distributions.results[0].id).toBe(distributionId);
  });

  it('holder should be able to claim the distribution', async () => {
    const params = claimDividendDistributionParams({
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.corporateActions.claimDividendDistribution(
      assetId,
      distributionId,
      params
    );
    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'corporateAction.claimDividendDistribution',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should reclaim the distribution', async () => {
    const params = reclaimDividendDistributionParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    const result = await restClient.corporateActions.reclaimDividendDistributionFunds(
      assetId,
      distributionId,
      params
    );
    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'corporateAction.reclaimDividendDistributionFunds',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should be able to get payment history', async () => {
    const result = await restClient.corporateActions.paymentHistory(assetId, distributionId);
    expect(result).toMatchObject({
      results: expect.arrayContaining([
        {
          transactionTag: 'corporateAction.paymentHistory',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
      total: 1,
    });
  });

  it('should be able to create another dividend distribution', async () => {
    const params = createDividendDistributionParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    const result = await restClient.corporateActions.configureDividendDistribution(assetId, params);
    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'corporateAction.configureDividendDistribution',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });

    distributionId = result.dividendDistribution.id as string;
  });

  it('should be able to modify the checkpoint', async () => {
    const params = modifyDistributionCheckpointParams(
      {
        options: { processMode: ProcessMode.Submit, signer },
      },
      undefined,
      { type: 'Existing', id: '1' }
    );
    const result = await restClient.corporateActions.modifyDistributionCheckpoint(
      assetId,
      distributionId,
      params
    );
    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'corporateAction.modifyDistributionCheckpoint',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });
});
