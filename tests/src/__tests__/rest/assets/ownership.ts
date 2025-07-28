import { AuthorizationType } from '@polymeshassociation/polymesh-sdk/types';

import { assertTagPresent } from '~/assertions';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams, transferAssetOwnershipParams } from '~/rest/assets/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';

const handles = ['issuer', 'newOwner'];
let factory: TestFactory;

describe('Transferring asset ownership', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let newOwner: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;
  let transferAuthId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    newOwner = factory.getSignerIdentity(handles[1]);

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

    const asset = await restClient.assets.getAsset(assetId);

    expect(asset).toMatchObject({
      name: assetParams.name,
      assetType: assetParams.assetType,
    });
  });

  it('should transfer the asset ownership to newOwner', async () => {
    const params = transferAssetOwnershipParams(newOwner.did, {
      options: { processMode: ProcessMode.Submit, signer },
    });
    const result = await restClient.assets.transferAssetOwnership(assetId, params);

    expect(result.authorizationRequest).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/\d+/),
        issuer: issuer.did,
        data: { type: 'TransferAssetOwnership', value: assetId },
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transferAuthId = (result.authorizationRequest as any).id;

    expect(result).toEqual(assertTagPresent(expect, 'identity.addAuthorization'));
  });

  it('should get list of pending authorizations before accepting', async () => {
    const pendingAuths = await restClient.identities.getPendingAuthorizations(
      newOwner.did,
      AuthorizationType.TransferAssetOwnership
    );

    expect(pendingAuths.received.length).toEqual(1);
  });

  it('should accept the transfer', async () => {
    const params = {
      options: { processMode: ProcessMode.Submit, signer: newOwner.signer },
    };

    const result = await restClient.identities.acceptAuthorization(transferAuthId, params);

    expect(result).toEqual(assertTagPresent(expect, 'asset.acceptAssetOwnershipTransfer'));
  });

  it('should reflect the newOwner as the owner of the asset', async () => {
    const asset = await restClient.assets.getAsset(assetId);

    expect(asset).toMatchObject({
      owner: newOwner.did,
    });
  });
});
