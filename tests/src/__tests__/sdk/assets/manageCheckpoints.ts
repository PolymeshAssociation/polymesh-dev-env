import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { createAsset } from '~/sdk/assets/createAsset';
import { manageCheckpoints } from '~/sdk/assets/manageCheckpoints';

let factory: TestFactory;

describe('manageCheckpoints', () => {
  let asset: FungibleAsset;
  let sdk: Polymesh;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    asset = await createAsset(sdk, { initialSupply: new BigNumber(100) });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should execute mangeCheckpoints without errors', async () => {
    await expect(manageCheckpoints(sdk, asset)).resolves.not.toThrow();
  });
});
