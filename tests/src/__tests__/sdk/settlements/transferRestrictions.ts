import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { createAsset } from '~/sdk/assets/createAsset';
import { transferRestrictions } from '~/sdk/settlements/transferRestrictions';

let factory: TestFactory;

describe('transferRestrictions', () => {
  let asset: FungibleAsset;
  let sdk: Polymesh;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    const initialSupply = new BigNumber(1000);
    asset = await createAsset(sdk, { initialSupply });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should execute without errors', async () => {
    await transferRestrictions(sdk, asset);
  });
});
