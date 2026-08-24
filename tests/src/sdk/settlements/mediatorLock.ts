import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  AffirmationStatus,
  FungibleAsset,
  Instruction,
  InstructionStatus,
  InstructionType,
  LegStatusType,
  VenueType,
} from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

import { createVenue } from '~/sdk/settlements/createVenue';
import { addIsNotBlocked } from '~/sdk/settlements/util';

/*
  An Instruction of type `SettleAfterLock` is held by a mediator until they lock it for
  execution. This script showcases the full lock/relock cycle. It:
    - Creates a `SettleAfterLock` Instruction with a mediator
    - Affirms it as every involved party, including the mediator
    - Locks it for execution and inspects the lock info
    - Unlocks it, returning it to `Pending`
    - Inspects the relock cooldown that unlocking starts
*/
export const createLockableInstruction = async (
  sdk: Polymesh,
  asset: FungibleAsset,
  counterPartyDid: string,
  mediatorDid: string,
  amount: BigNumber
): Promise<Instruction> => {
  const [identity, counterParty] = await Promise.all([
    sdk.getSigningIdentity(),
    sdk.identities.getIdentity({ did: counterPartyDid }),
  ]);
  assert(identity);

  await addIsNotBlocked(asset);

  const venue = await createVenue(sdk, {
    description: 'Mediated settlement venue',
    type: VenueType.Exchange,
  });

  const destinationPortfolio = await counterParty.portfolios.getPortfolio();

  const addInstructionTx = await venue.addInstruction({
    legs: [
      {
        from: identity,
        to: destinationPortfolio,
        amount,
        asset: asset.id,
      },
    ],
    mediators: [mediatorDid],
    endAfterLock: true,
    memo: 'Locked settlement',
  });

  const instruction = await addInstructionTx.run();
  assert(addInstructionTx.isSuccess, 'add instruction should succeed');

  const details = await instruction.detailsFromChain();
  assert(
    details.type === InstructionType.SettleAfterLock,
    `the instruction should be of type SettleAfterLock, got ${details.type}`
  );

  return instruction;
};

/**
 * Affirms the Instruction as the receiver and as the mediator, leaving it ready to be locked
 *
 * @note a receiver that has not opted in to mandatory affirmation is affirmed on creation,
 *   so the receiving side only needs to affirm when it is still pending
 */
export const affirmForLock = async (
  instruction: Instruction,
  counterPartyDid: string,
  counterPartyAddress: string,
  mediatorAddress: string
): Promise<void> => {
  const { data: affirmations } = await instruction.getAffirmations();

  const counterPartyAffirmed = affirmations.some(
    ({ party, status }) =>
      'did' in party && party.did === counterPartyDid && status === AffirmationStatus.Affirmed
  );

  if (!counterPartyAffirmed) {
    const affirmTx = await instruction.affirm({}, { signingAccount: counterPartyAddress });
    await affirmTx.run();
    assert(affirmTx.isSuccess, 'the receiver should be able to affirm');
  }

  const affirmAsMediatorTx = await instruction.affirmAsMediator(
    {},
    { signingAccount: mediatorAddress }
  );
  await affirmAsMediatorTx.run();
  assert(affirmAsMediatorTx.isSuccess, 'the mediator should be able to affirm');

  const pendingAffirmations = await instruction.getPendingAffirmationCount();
  assert(
    pendingAffirmations.isZero(),
    `the instruction should have no pending affirmations, got ${pendingAffirmations.toString()}`
  );
};

/**
 * Locks the Instruction for execution as its mediator and asserts the reported lock info
 */
export const lockInstruction = async (
  instruction: Instruction,
  mediatorAddress: string
): Promise<void> => {
  const lockedBefore = await instruction.getLockedInfo();
  assert(!lockedBefore.isLocked, 'the instruction should not be locked before locking it');

  const lockTx = await instruction.lockForExecution({ signingAccount: mediatorAddress });
  await lockTx.run();
  assert(lockTx.isSuccess, 'the mediator should be able to lock the instruction');

  const lockedAfter = await instruction.getLockedInfo();
  assert(lockedAfter.isLocked, 'the instruction should be locked after locking it');
  assert(lockedAfter.lockedAt instanceof Date, 'a locked instruction should report `lockedAt`');
  assert(lockedAfter.unlocksAt instanceof Date, 'a locked instruction should report `unlocksAt`');
  assert(
    lockedAfter.expiry instanceof BigNumber,
    'a locked instruction should report its lock `expiry`'
  );
};

/**
 * Asserts the leg statuses reported for a locked Instruction
 */
export const assertLegStatuses = async (instruction: Instruction): Promise<void> => {
  const { data: legs } = await instruction.getLegsFromChain();
  assert(legs.length > 0, 'the instruction should have at least one leg');

  const statuses = await Promise.all(
    legs.map((_, index) => instruction.getLegStatus({ legId: new BigNumber(index) }))
  );

  const knownTypes = Object.values(LegStatusType);
  statuses.forEach(({ type }, index) => {
    assert(
      knownTypes.includes(type),
      `leg ${index} reported an unknown status type: ${String(type)}`
    );
  });
};

/**
 * Unlocks a locked Instruction as its mediator and asserts the relock cooldown it starts
 */
export const unlockInstruction = async (
  instruction: Instruction,
  mediatorAddress: string
): Promise<void> => {
  const relockBefore = await instruction.getRelockStatus();
  assert(relockBefore.unlockedAt === null, 'the instruction should not have been unlocked yet');
  assert(relockBefore.relockCount.isZero(), 'the relock count should start at zero');

  const unlockTx = await instruction.unlockForExecution({ signingAccount: mediatorAddress });
  await unlockTx.run();
  assert(unlockTx.isSuccess, 'the mediator should be able to unlock the instruction');

  const lockedInfo = await instruction.getLockedInfo();
  assert(!lockedInfo.isLocked, 'the instruction should no longer be locked');

  const relockAfter = await instruction.getRelockStatus();
  assert(
    relockAfter.unlockedAt instanceof Date,
    'an unlocked instruction should report `unlockedAt`'
  );
  assert(
    relockAfter.cooldownEndsAt instanceof Date,
    'an unlocked instruction should report `cooldownEndsAt`'
  );
  assert(
    relockAfter.maxRelockCount.gte(relockAfter.relockCount),
    'the relock count should not exceed the maximum allowed'
  );

  const isPending = await instruction.isPending();
  assert(isPending, 'the instruction should return to pending after being unlocked');

  /*
    Regresses a polymesh-subquery mapper bug: the indexer had no handler for
    `settlement.InstructionUnlocked`, so the middleware-indexed Instruction status never left
    `LockedForExecution` even though the on-chain status (checked above) correctly reverted to
    `Pending`. Poll briefly to allow for normal indexing lag.
  */
  const deadline = Date.now() + 60_000;
  let middlewareStatus: InstructionStatus | undefined;
  do {
    ({ status: middlewareStatus } = await instruction.details());
    if (middlewareStatus === InstructionStatus.Pending) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 2_000));
  } while (Date.now() < deadline);

  assert.strictEqual(
    middlewareStatus,
    InstructionStatus.Pending,
    `the middleware-indexed instruction status should revert to Pending after unlocking, got ${String(middlewareStatus)}`
  );
};
