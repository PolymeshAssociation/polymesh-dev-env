import { BigNumber } from '@polymeshassociation/polymesh-sdk';

import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams, setAssetDocumentParams } from '~/rest/assets/params';
import { ProcessMode } from '~/rest/common';
import { createDividendDistributionParams } from '~/rest/corporate-actions/params';
import { Identity } from '~/rest/identities/interfaces';

const handles = ['issuer'];
let factory: TestFactory;

describe('Corporate Action documents', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let assetId: string;
  let distributionId: BigNumber;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    signer = issuer.signer;

    // `currency` on the distribution must be an uppercase ticker, so give this Asset one (the
    // shared params default has no ticker, since Assets are ID-addressed on chain v8)
    const ticker = factory.nextTicker();
    const assetParams = createAssetParams(
      {
        options: { processMode: ProcessMode.Submit, signer },
      },
      { ticker }
    );
    assetId = await restClient.assets.createAndGetAssetId(assetParams);

    const distributionParams = createDividendDistributionParams(
      {
        options: { processMode: ProcessMode.Submit, signer },
      },
      { currency: ticker }
    );
    const distributionResult = await restClient.corporateActions.configureDividendDistribution(
      assetId,
      distributionParams
    );
    distributionId = new BigNumber(distributionResult.dividendDistribution.id as string);
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should report no documents linked to the Corporate Action', async () => {
    const result = await restClient.corporateActions.getDocuments(assetId, distributionId);

    expect(result).toEqual({ results: [] });
  });

  it('should link documents to the Corporate Action', async () => {
    const docParams = setAssetDocumentParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    await restClient.assets.setDocuments(assetId, docParams);

    const { documents } = docParams;
    const linkResult = await restClient.corporateActions.linkDocuments(
      assetId,
      distributionId,
      {
        documents,
        options: { processMode: ProcessMode.Submit, signer },
      }
    );

    expect(linkResult).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'corporateAction.linkCaDoc',
          ...expectBasicTxInfo,
        }),
      ]),
    });

    const linkedDocuments = await restClient.corporateActions.getDocuments(
      assetId,
      distributionId
    );

    expect(linkedDocuments).toMatchObject({
      results: expect.arrayContaining(
        documents.map((document) => expect.objectContaining(document))
      ),
    });
  });
});
