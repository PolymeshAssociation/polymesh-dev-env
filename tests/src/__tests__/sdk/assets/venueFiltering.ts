import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { createAsset } from '~/sdk/assets/createAsset';
import { venueFiltering } from '~/sdk/assets/venueFiltering';

let factory: TestFactory;

describe('venueFiltering', () => {
  let asset: FungibleAsset;
  let sdk: Polymesh;
  let targetDid: string;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    const targetMnemonic = LocalSigningManager.generateAccount();
    const targetAddress = factory.signingManager.addAccount({
      mnemonic: targetMnemonic,
    });

    ({
      results: [{ did: targetDid }],
    } = await factory.createIdentityForAddresses([targetAddress]));

    asset = await createAsset(sdk, {});
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should execute venueFiltering without errors', async () => {
    await venueFiltering(sdk, asset, targetDid);
  });
});
