import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams } from '~/rest/assets';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { portfolioParams } from '~/rest/portfolios';

const handles = ['issuer', 'holder'];
let factory: TestFactory;

describe('Portfolio Asset pre-approval', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let holder: Identity;
  let assetId: string;
  let portfolioId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    holder = factory.getSignerIdentity(handles[1]);
    signer = issuer.signer;

    const assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    assetId = await restClient.assets.createAndGetAssetId(assetParams);

    const params = portfolioParams(factory.nextPortfolio(), {
      options: { processMode: ProcessMode.Submit, signer: holder.signer },
    });
    const { portfolio } = await restClient.portfolios.createPortfolio(params);
    portfolioId = portfolio.id;
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should report the asset as not pre-approved for the Portfolio initially', async () => {
    const result = await restClient.portfolios.getIsPreApproved(holder.did, portfolioId, assetId);

    expect(result).toEqual({
      did: holder.did,
      asset: assetId,
      isPreApproved: false,
    });
  });

  it('should pre-approve the asset for the Portfolio', async () => {
    const txData = await restClient.portfolios.preApproveAsset(holder.did, portfolioId, {
      asset: assetId,
      options: { processMode: ProcessMode.Submit, signer: holder.signer },
    });

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'portfolio.preApprovePortfolio',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should list the asset among the Portfolio pre-approved assets', async () => {
    const [isPreApproved, { results }] = await Promise.all([
      restClient.portfolios.getIsPreApproved(holder.did, portfolioId, assetId),
      restClient.portfolios.getPreApprovedAssets(holder.did, portfolioId),
    ]);

    expect(isPreApproved).toEqual({
      did: holder.did,
      asset: assetId,
      isPreApproved: true,
    });
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ asset: assetId, isPreApproved: true }),
      ])
    );
  });

  it('should not pre-approve the asset at the Identity level', async () => {
    const result = await restClient.assets.getIsPreApproved(assetId, holder.did);

    expect(result).toEqual({
      did: holder.did,
      asset: assetId,
      isPreApproved: false,
    });
  });

  it('should remove the Portfolio pre-approval', async () => {
    const txData = await restClient.portfolios.removePreApproval(holder.did, portfolioId, {
      asset: assetId,
      options: { processMode: ProcessMode.Submit, signer: holder.signer },
    });

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'portfolio.removePortfolioPreApproval',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });

    const result = await restClient.portfolios.getIsPreApproved(holder.did, portfolioId, assetId);
    expect(result.isPreApproved).toBe(false);
  });
});
