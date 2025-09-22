import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset, VenueType } from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

/*
  This script showcases VenueFiltering related functionality. It:
    - Creates an asset
    - Enables venue filtering
    - Creates multiple venues
    - Adds venues to the asset
    - Fetches the asset's venues
    - Removes venues from the asset
    - Fetches the asset's venues
    - Tries to create an instruction on a removed venue
    - Disables venue filtering
    - Fetches the asset's venues
    - Tries to create an instruction on a venue that was previously removed
*/

export const venueFiltering = async (
  sdk: Polymesh,
  asset: FungibleAsset,
  targetDid: string
): Promise<void> => {
  const identity = await sdk.getSigningIdentity();
  assert(identity);

  // Enable venue filtering
  const enableVenueFilteringTx = await asset.setVenueFiltering({
    enabled: true,
  });
  await enableVenueFilteringTx.run();
  assert(enableVenueFilteringTx.isSuccess);

  // Create a venue
  const createVenueTx = await sdk.settlements.createVenue({
    description: 'test',
    type: VenueType.Exchange,
  });

  // Create venues
  const venue1 = await createVenueTx.run();
  assert(createVenueTx.isSuccess);
  assert(BigNumber.isBigNumber(venue1.id));

  const createVenueTx2 = await sdk.settlements.createVenue({
    description: 'test2',
    type: VenueType.Exchange,
  });
  const venue2 = await createVenueTx2.run();
  assert(createVenueTx2.isSuccess);
  assert(BigNumber.isBigNumber(venue2.id));

  // Add venues to asset
  const addVenueTx = await asset.setVenueFiltering({
    allowedVenues: [venue1.id, venue2.id],
  });
  await addVenueTx.run();
  assert(addVenueTx.isSuccess);

  // Fetch asset's venues
  const details = await asset.getVenueFilteringDetails();
  assert(details.isEnabled);
  assert(details.allowedVenues.length === 2);
  assert(details.allowedVenues.some((venue) => venue.id.eq(venue1.id)));
  assert(details.allowedVenues.some((venue) => venue.id.eq(venue2.id)));

  // Remove venues from asset
  const removeVenueTx = await asset.setVenueFiltering({
    disallowedVenues: [venue2.id],
  });
  await removeVenueTx.run();
  assert(removeVenueTx.isSuccess);

  // Fetch asset's venues
  const details2 = await asset.getVenueFilteringDetails();
  assert(details2.isEnabled);
  assert(details2.allowedVenues.length === 1);
  assert(details2.allowedVenues.some((venue) => venue.id.eq(venue1.id)));
  assert(!details2.allowedVenues.some((venue) => venue.id.eq(venue2.id)));

  // Try to create an instruction on a removed venue
  await expect(async () => {
    await sdk.settlements.addInstruction({
      venueId: venue2.id,
      legs: [{ asset, from: identity, to: targetDid, amount: new BigNumber(1000) }],
    });
  }).rejects.toThrow();

  // Disable venue filtering
  const disableVenueFilteringTx = await asset.setVenueFiltering({
    enabled: false,
  });
  await disableVenueFilteringTx.run();
  assert(disableVenueFilteringTx.isSuccess);

  // Instruction should be created on any venue
  await expect(async () => {
    await sdk.settlements.addInstruction({
      venueId: venue2.id,
      legs: [{ asset, from: identity, to: targetDid, amount: new BigNumber(1000) }],
    });
  }).not.toThrow();
};
