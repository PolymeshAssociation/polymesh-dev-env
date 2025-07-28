import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams } from '~/rest/assets';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';

const handles = ['issuer'];
let factory: TestFactory;

describe('Asset pre-approval', () => {
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

  it('should set asset pre-approval', async () => {
    const params = { options: { processMode: ProcessMode.Submit, signer } };
    const txData = await restClient.assets.preApprove(assetId, params);

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'asset.preApproveAsset',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should return the asset as pre-approved', async () => {
    const result = await restClient.assets.getIsPreApproved(assetId, issuer.did);

    expect(result).toEqual({
      did: issuer.did,
      asset: assetId,
      isPreApproved: true,
    });
  });

  it('should return a page of pre-approved assets', async () => {
    const results = await restClient.assets.getPreApprovals(issuer.did);

    expect(results).toEqual({
      results: [
        {
          asset: assetId,
          did: issuer.did,
          isPreApproved: true,
        },
      ],
    });
  });

  it('should remove asset pre-approval', async () => {
    const txData = await restClient.assets.removePreApproval(assetId, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          type: 'single',
          transactionTag: 'asset.removeAssetPreApproval',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });
});
