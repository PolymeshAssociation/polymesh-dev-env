import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

/*
  This script showcases Checkpoints related functionality. It:
    - Creates a Checkpoint
    - Fetches asset's Checkpoints
    - Fetches Checkpoint details
    - Creates a Schedule
    - Fetches asset's Schedules
    - Fetches Schedule details
    - Fetches Checkpoints originated by a Schedule
    - Deletes a Schedule
*/
export const manageCheckpoints = async (sdk: Polymesh, asset: FungibleAsset): Promise<void> => {
  const signingIdentity = await sdk.getSigningIdentity();
  assert(signingIdentity);

  // The signing identity should be an agent of the Asset and have appropriate permission

  // prepare and run a create checkpoint transaction
  const createCheckpointTx = await asset.checkpoints.create();
  const newCheckpoint = await createCheckpointTx.run();

  // fetch checkpoint details
  const [createdAt, totalSupply] = await Promise.all([
    newCheckpoint.createdAt(),
    newCheckpoint.totalSupply(),
  ]);
  assert(createdAt instanceof Date);
  assert(totalSupply instanceof BigNumber);

  // get an Identity's balance at the checkpoint
  const currentBalance = await signingIdentity.getAssetBalance({ assetId: asset.id });
  const balanceAtCheckpoint = await newCheckpoint.balance({ identity: signingIdentity });
  assert(
    balanceAtCheckpoint.eq(currentBalance),
    `The checkpoint balance should equal the current balance for ${signingIdentity.did}`
  );

  const { data: allBalances } = await newCheckpoint.allBalances({
    start: undefined,
    size: new BigNumber(10),
  });
  assert(Array.isArray(allBalances), 'allBalances should return a data array');

  const { data: checkpoints } = await asset.checkpoints.get();
  assert(
    checkpoints.some(({ checkpoint: { id } }) => id.eq(newCheckpoint.id)),
    'asset checkpoints should return the created checkpoint'
  );

  // A schedule will create checkpoints on a regular cadence. e.g. for a monthly dividend
  const points = Array.from({ length: 12 }, (_, i) => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() + i + 1);
    return currentDate;
  });
  const createScheduleTx = await asset.checkpoints.schedules.create({
    points,
  });
  const newSchedule = await createScheduleTx.run();
  assert(createCheckpointTx.isSuccess);

  // fetch schedule details
  const { nextCheckpointDate, remainingCheckpoints } = await newSchedule.details();
  assert(nextCheckpointDate instanceof Date);
  assert(remainingCheckpoints instanceof BigNumber);

  // fetch Checkpoints created by the schedule
  const createdCheckpoints = await newSchedule.getCheckpoints();
  assert(Array.isArray(createdCheckpoints), 'checkpoints should be an array');

  // fetch active schedules for an asset
  const activeSchedules = await asset.checkpoints.schedules.get();
  assert(activeSchedules.length > 0, `${asset.id} should have at least one active schedule`);

  // A schedule can be removed if its no longer needed
  const removeScheduleTx = await asset.checkpoints.schedules.remove({
    schedule: newSchedule,
  });
  await removeScheduleTx.run();
  assert(removeScheduleTx.isSuccess);
};
