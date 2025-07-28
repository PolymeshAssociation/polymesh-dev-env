import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { addAssetAgent } from '~/sdk/assets/addAssetAgent';
import { createAsset } from '~/sdk/assets/createAsset';

let factory: TestFactory;

describe('addAssetAgent', () => {
  let asset: FungibleAsset;
  let targetDid: string;
  let sdk: Polymesh;

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

  it('should execute addAssetAgent without errors', async () => {
    await addAssetAgent(sdk, targetDid, asset);
  });
});
