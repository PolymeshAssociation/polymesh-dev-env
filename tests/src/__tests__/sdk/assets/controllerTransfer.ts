import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { fungibleAssetControllerTransfer } from '~/sdk/assets/controllerTransfer';

let factory: TestFactory;

describe('controllerTransfer', () => {
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

  });

  afterAll(async () => {
    await factory.close();
  });

  it('should execute controllerTransfer without errors', async () => {
    await fungibleAssetControllerTransfer(sdk, targetDid);
  });
});
