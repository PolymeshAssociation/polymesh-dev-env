import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams, setAssetDocumentParams } from '~/rest/assets';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';

const handles = ['issuer'];
let factory: TestFactory;

describe('AssetDocument', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let asset: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);

    signer = issuer.signer;

    assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    asset = await restClient.assets.createAndGetAssetId(assetParams);
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should set Asset Documents', async () => {
    const params = setAssetDocumentParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    const txData = await restClient.assets.setDocuments(asset, params);

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTags: ['asset.removeDocuments', 'asset.addDocuments'],
          type: 'batch',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should get an Asset documents', async () => {
    const result = await restClient.assets.getDocuments(asset);

    expect(result).toEqual(
      expect.objectContaining({
        results: [
          {
            name: 'Document 1',
            uri: 'https://example.com/document.pdf',
            type: 'PDF',
          },
          {
            name: 'Document 2',
            uri: 'https://example.com/document2.pdf',
            type: 'PDF',
          },
        ],
      })
    );
  });
});
