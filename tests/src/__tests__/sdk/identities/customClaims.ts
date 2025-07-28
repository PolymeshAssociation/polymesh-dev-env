import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { Identity } from '~/rest/identities';
import { createAsset } from '~/sdk/assets/createAsset';
import { manageCustomClaims } from '~/sdk/identities/customClaims';

let factory: TestFactory;
const handles = ['claimTarget'];

describe('manageCustomClaims', () => {
  let sdk: Polymesh;
  let targetIdentity: Identity;
  let asset: FungibleAsset;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    targetIdentity = factory.getSignerIdentity(handles[0]);
    sdk = factory.polymeshSdk;
    asset = await createAsset(sdk, {});
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should execute manageClaimsCustomClaims without errors', async () => {
    await expect(manageCustomClaims(sdk, targetIdentity.did, asset)).resolves.not.toThrow();
  });
});
