import { BigNumber } from '@polymeshassociation/polymesh-sdk';

import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams, transferFundsParams } from '~/rest/assets';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestSuccessResult } from '~/rest/interfaces';
import { portfolioParams } from '~/rest/portfolios';
import { awaitMiddlewareSyncedForRestApi } from '~/util';

const handles = ['issuer', 'investor'];
let factory: TestFactory;

describe('POST /assets/transfer-funds', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let investor: Identity;
  let assetId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    investor = factory.getSignerIdentity(handles[1]);
    signer = issuer.signer;

    const assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    assetId = await restClient.assets.createAndGetAssetId(assetParams);
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should settle immediately and return no Instruction for a same-Identity transfer', async () => {
    const params = portfolioParams(factory.nextPortfolio(), {
      options: { processMode: ProcessMode.Submit, signer },
    });
    const { portfolio } = await restClient.portfolios.createPortfolio(params);

    const txData = await restClient.assets.transferFunds(
      transferFundsParams(
        assetId,
        { did: issuer.did, id: '0' },
        { did: issuer.did, id: portfolio.id },
        '100',
        { options: { processMode: ProcessMode.Submit, signer } }
      )
    );

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([expect.objectContaining({ ...expectBasicTxInfo })]),
    });
    expect((txData as RestSuccessResult).instruction).toBeUndefined();

    const portfolioData = await restClient.portfolios.getPortfolio(issuer.did, portfolio.id);
    const hasAsset = portfolioData.assetBalances.find((balance) => balance.asset === assetId);
    expect(hasAsset?.total).toBe('100');
  });

  it('should return a pending Instruction for a cross-Identity transfer awaiting affirmation', async () => {
    // Receivers auto-affirm by default; opt the investor into mandatory affirmation so the
    // transfer is guaranteed to come back as a pending Instruction rather than settle inline.
    await restClient.identities.setMandatoryReceiverAffirmation(investor.did, {
      requirement: 'Required',
      options: { processMode: ProcessMode.Submit, signer: investor.signer },
    });

    const txData = await restClient.assets.transferFunds(
      transferFundsParams(
        assetId,
        { did: issuer.did, id: '0' },
        { did: investor.did, id: '0' },
        '50',
        { options: { processMode: ProcessMode.Submit, signer } }
      )
    );

    const instructionId = (txData as RestSuccessResult).instruction as string;
    expect(instructionId).toEqual(expect.any(String));

    await awaitMiddlewareSyncedForRestApi(
      txData as RestSuccessResult,
      restClient,
      new BigNumber(1)
    );

    const details = await restClient.settlements.getInstruction(instructionId);
    expect(details).toMatchObject({ status: 'Pending' });

    const affirmResult = await restClient.settlements.affirmInstruction(instructionId, {
      options: { processMode: ProcessMode.Submit, signer: investor.signer },
    });
    expect(affirmResult).toMatchObject({
      transactions: expect.arrayContaining([expect.objectContaining({ ...expectBasicTxInfo })]),
    });
  });
});
