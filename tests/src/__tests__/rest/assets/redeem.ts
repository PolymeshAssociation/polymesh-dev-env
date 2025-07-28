import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams, redeemTokenParams } from '~/rest/assets';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { moveAssetParams, portfolioParams } from '~/rest/portfolios';

const handles = ['issuer'];
let factory: TestFactory;

describe('Redeem', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);

    signer = issuer.signer;

    assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    assetId = await restClient.assets.createAndGetAssetId(assetParams);
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should redeem tokens from default Portfolio', async () => {
    const params = redeemTokenParams('0', {
      options: { processMode: ProcessMode.Submit, signer },
    });
    const txData = await restClient.assets.redeem(assetId, params);

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'asset.redeem',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should redeem tokens from specified Portfolio', async () => {
    const portfolioName = factory.nextPortfolio();
    const createPortfolioParams = portfolioParams(portfolioName, {
      options: { processMode: ProcessMode.Submit, signer },
    });
    const result = await restClient.portfolios.createPortfolio(createPortfolioParams);
    const createdPortfolio = result.portfolio.id;

    const moveFundParams = moveAssetParams(assetId, '0', createdPortfolio, {
      options: { processMode: ProcessMode.Submit, signer },
    });
    await restClient.portfolios.moveAssets(issuer.did, moveFundParams);

    const params = redeemTokenParams(createdPortfolio, {
      options: { processMode: ProcessMode.Submit, signer },
    });
    const txData = await restClient.assets.redeem(assetId, params);

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'asset.redeem',
          type: 'single',
          ...expectBasicTxInfo,
        }),
      ]),
    });
  });
});
