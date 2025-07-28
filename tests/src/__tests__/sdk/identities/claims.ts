import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { Identity } from '~/rest/identities';
import { createAsset } from '~/sdk/assets/createAsset';
import { manageClaims } from '~/sdk/identities/claims';

let factory: TestFactory;
const handles = ['claimTarget'];

describe('manageClaims', () => {
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

  it('should execute manageClaims without errors', async () => {
    await expect(manageClaims(sdk, targetIdentity.did, asset.id)).resolves.not.toThrow();
  });
});
