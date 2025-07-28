import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  InstructionOffChainLeg,
  SignerKeyRingType,
  VenueType,
} from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

import { createVenue } from '~/sdk/settlements/createVenue';
import { awaitMiddlewareSynced } from '~/util';

interface OffChainLegInfo {
  ticker: string;
  offChainAmount: BigNumber;
}

/*
  Instructions are the primary way to move Assets on Polymesh. Some points to know:

  - An instruction is composed of multiple legs, each leg represents an Asset movement.
  - The execution of the Instruction is atomic - either all legs are executed or none are
  - Every Identity referenced in any leg must affirm before the Instruction can be executed
  - Every Identity must comply with any transfer and compliance restrictions on the Asset
  - Every Instruction is associated with a Venue, allowing for an optional 3rd party to mediate

  This script showcases Settlement related functionality. It:
    - Creates a Venue
    - Fetches a Venue's details
    - Fetches all of the signing Identity's Venues
    - Adds an Instruction to a Venue
    - Fetches all of the signing Identity's Pending Instructions
    - Affirm//Reject an Instruction
*/
export const tradeOffChainAssets = async (
  sdk: Polymesh,
  senderDid: string,
  receiverDid: string,
  signer: string,
  bid: OffChainLegInfo,
  ask: OffChainLegInfo
): Promise<void> => {
  const identity = await sdk.getSigningIdentity();
  assert(identity);

  // NOTE: that no compliance requirement are needed to transfer any off chain asset

  // First we create a venue specifying the signers allowed to sign off chain receipts
  const venue = await createVenue(sdk, {
    description: 'Off chain settlement venue',
    type: VenueType.Exchange,
    signers: [signer],
  });

  /**
   * Unlike the other legs, OffChainLeg has `from` and `to` as DIDs/identities instead of Portfolio.
   * Also, to distinguish between legs, amount is specified as `offChainAmount`.
   * `asset` field represents off chain asset being transferred
   */
  const getOffChainLeg = (data: OffChainLegInfo): InstructionOffChainLeg => ({
    from: senderDid,
    to: receiverDid,
    offChainAmount: data.offChainAmount,
    asset: data.ticker,
  });

  const legs = [getOffChainLeg(bid), getOffChainLeg(ask)];
  const addInstructionTx = await venue.addInstruction({
    legs,
    endAfterBlock: new BigNumber(0), // if specified the execution of the settlement can be done manually after this block. We set this to 0, so that we can execute once we have all the off chain affirmations
    tradeDate: new Date('2024/01/01'),
    valueDate: new Date('2024/01/10'),
    memo: 'Some message',
  });

  const instruction = await addInstructionTx.run();
  assert(addInstructionTx.isSuccess, 'add instruction should succeed');

  await awaitMiddlewareSynced(addInstructionTx, sdk);

  const details = await instruction.details();
  assert(details.memo, 'the instruction should have a memo');

  // since this contains only off-chain legs, there will be no affirmations
  const { data: affirmations } = await instruction.getAffirmations();
  assert(affirmations.length === 0, 'the instruction should have no affirmation');

  /**
   * Off chain legs require a receipt for affirmation.
   * Each off-chain affirmation receipt can be generated for a signer by specifying
   * the legId (index of the leg in the instruction) and uid (Unique identifier used by the signer for the receipt)
   *
   * NOTE - A signer of the receipt can only use a UID once
   */
  const offChainReceipts = await Promise.all(
    legs.map((_, index) =>
      instruction.generateOffChainAffirmationReceipt({
        legId: new BigNumber(index),
        uid: new BigNumber(index + 1),
        metadata: `Optional metadata for leg ${index}`,
        signer: signer,
        signerKeyRingType: SignerKeyRingType.Sr25519, // this is the default value as well
      })
    )
  );

  const affirmWithReceiptTx = await instruction.affirm({
    receipts: offChainReceipts,
  });

  await affirmWithReceiptTx.run();
  assert(affirmWithReceiptTx.isSuccess);

  await awaitMiddlewareSynced(affirmWithReceiptTx, sdk);

  // Fetch and verify off chain affirmations
  const offChainAffirmations = await instruction.getOffChainAffirmations();

  assert(
    offChainAffirmations.length === 2,
    `off-chain affirmations for the instruction. expected 2 received ${offChainAffirmations.length}`
  );

  // we can not execute the instruction
  const executeInstructionTx = await instruction.executeManually({
    skipAffirmationCheck: true,
  });

  await executeInstructionTx.run();
  assert(executeInstructionTx.isSuccess);
};
