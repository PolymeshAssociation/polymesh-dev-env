import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams } from '~/rest/assets';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { fungibleInstructionParams, venueParams } from '~/rest/settlements';

const handles = ['issuer', 'receiver'];
let factory: TestFactory;

describe('Asset pre-approval', () => {
  let restClient: RestClient;
  let issuerSigner: string;
  let receiverSigner: string;
  let issuer: Identity;
  let receiver: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    receiver = factory.getSignerIdentity(handles[1]);

    issuerSigner = issuer.signer;
    receiverSigner = receiver.signer;

    assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer: issuerSigner },
    });
    assetId = await restClient.assets.createAndGetAssetId(assetParams);
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should set asset pre-approval', async () => {
    const params = { options: { processMode: ProcessMode.Submit, signer: receiverSigner } };
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
    const result = await restClient.assets.getIsPreApproved(assetId, receiver.did);

    expect(result).toEqual({
      did: receiver.did,
      asset: assetId,
      isPreApproved: true,
    });
  });

  it('should return a page of pre-approved assets', async () => {
    const results = await restClient.assets.getPreApprovals(receiver.did);

    expect(results).toEqual({
      results: [
        {
          asset: assetId,
          did: receiver.did,
          isPreApproved: true,
        },
      ],
    });
  });

  it('should transfer the asset without an approval', async () => {
    const params = venueParams({
      options: { processMode: ProcessMode.Submit, signer: issuerSigner },
    });
    const txData = await restClient.settlements.createVenue(params);

    const { venue: venueId } = txData as { venue: string };

    const instructionParams = fungibleInstructionParams(assetId, issuer.did, receiver.did, {
      options: { processMode: ProcessMode.Submit, signer: issuerSigner },
    });
    await restClient.settlements.createInstruction(venueId, instructionParams);

    const portfolioData = await restClient.portfolios.getPortfolio(receiver.did, '0');

    const hasAsset = portfolioData.assetBalances.find((asset) => asset.asset === assetId);

    expect(hasAsset).toBeDefined();
  });

  it('should remove asset pre-approval', async () => {
    const txData = await restClient.assets.removePreApproval(assetId, {
      options: { processMode: ProcessMode.Submit, signer: receiverSigner },
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
