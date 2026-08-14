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

  it('should report a null next Checkpoint for an Asset without Schedules', async () => {
    await expect(asset.checkpoints.schedules.getNextCheckpoint()).resolves.toBeNull();
  });

  it('should execute mangeCheckpoints without errors', async () => {
    await expect(manageCheckpoints(sdk, asset)).resolves.not.toThrow();
  });

  /*
    Known SDK defect (as of 31.0.0-beta.7). `getNextCheckpoint` is documented to resolve to
    `null` when an Asset has no active Schedules, and it does while `cachedNextCheckpoints` is
    unset. Once every Schedule has been removed the chain keeps the entry with a
    `nextAt` sentinel of `u64::MAX`, which `momentToDate` cannot convert.

    When the SDK is fixed this test will start failing: replace it with the `null` assertion above.
  */
  it('should throw instead of returning null once every Schedule has been removed', async () => {
    const schedules = await asset.checkpoints.schedules.get();
    expect(schedules).toHaveLength(0);

    await expect(asset.checkpoints.schedules.getNextCheckpoint()).rejects.toThrow(
      'Number can only safely store up to 53 bits'
    );
  });
});
