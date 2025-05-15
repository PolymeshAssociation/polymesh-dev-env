import { BigNumber, Polymesh } from "@polymeshassociation/polymesh-sdk";
import { FungibleAsset } from "@polymeshassociation/polymesh-sdk/internal";
import { VenueType } from "@polymeshassociation/polymesh-sdk/types";
import assert from "node:assert";

import { addIsNotBlocked } from "~/sdk/settlements/util";
import { awaitMiddlewareSynced } from "~/util";

interface Leg {
  asset: FungibleAsset;
  amount: BigNumber;
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
export const tradeAssets = async (
  sdk: Polymesh,
  counterPartyDid: string,
  bid: Leg,
  ask: Leg
): Promise<void> => {
  const [identity, counterParty] = await Promise.all([
    sdk.getSigningIdentity(),
    sdk.identities.getIdentity({ did: counterPartyDid }),
  ]);
  const bidAsset = bid.asset;
  const askAsset = ask.asset;
  assert(identity);

  const { account: counterPartyAccount } =
    await counterParty.getPrimaryAccount();

  // Assets need non compliance requirements set before they can be traded
  await Promise.all([
    addIsNotBlocked(bidAsset),
    addIsNotBlocked(askAsset, counterPartyAccount.address),
  ]);

  const venueTx = await sdk.settlements.createVenue({
    description: "Example Venue",
    type: VenueType.Exchange,
  });
  const venue = await venueTx.run();
  assert(venueTx.isSuccess);

  const venueDetails = await venue.details();
  assert(
    venueDetails.owner.did === identity.did,
    "default signer should own the Venue"
  );

  /* An Identities Venues can be fetched */
  const venues = await identity.getVenues();
  assert(
    venues.some(({ id }) => id.eq(venue.id)),
    "The created venue should be returned"
  );

  // Find the portfolio to trade with
  const destinationPortfolio = await counterParty.portfolios.getPortfolio();

  const addInstructionTx = await venue.addInstruction({
    legs: [
      {
        from: identity, // Passing an Identity implies the default Portfolio
        to: destinationPortfolio, // Otherwise a Portfolio object should be passed
        amount: bid.amount,
        asset: bid.asset.id,
      },
      {
        to: identity,
        from: destinationPortfolio,
        amount: ask.amount,
        asset: ask.asset,
      },
    ],
    endBlock: undefined, // if specified the execution of the settlement will be delayed until this block
    tradeDate: undefined, // (optional) - specify a date if there are off chain components in the transaction
    memo: "Some message", // optional - passing a message with the instruction
  });

  const instruction = await addInstructionTx.run();
  assert(addInstructionTx.isSuccess, "add instruction should succeed");

  await awaitMiddlewareSynced(addInstructionTx, sdk, 15, 2000);

  const details = await instruction.details();
  assert(details.memo, "the instruction should have a memo");

  // by default the submitter will automatically affirm the instruction
  const { data: affirmations } = await instruction.getAffirmations();
  assert(affirmations.length > 0, "the instruction should have an affirmation");

  const { pending } = await counterParty.getInstructions();

  const counterInstruction = pending.find(({ id }) => id.eq(instruction.id));
  assert(
    counterInstruction,
    "the counter party should have the instruction as pending"
  );

  // All legs of an Instruction should be inspected before before affirming
  const { data: legs } = await counterInstruction.getLegs();
  assert(legs.length > 0, "the instruction should have some legs");

  /*
   Affirm the instruction, `counterInstruction.reject()` is another option

   Note, the actual settlement will be executed in a block after the final affirmation.
   The instruction can still be rejected even if the final affirmation succeeds
  */
  const affirmTx = await counterInstruction.affirm(
    {},
    { signingAccount: counterPartyAccount }
  );
  await affirmTx.run();
  assert(affirmTx.isSuccess);
};
