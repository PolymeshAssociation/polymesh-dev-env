import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  CreateVenueParams,
  Identity,
  Venue,
  VenueType,
} from '@polymeshassociation/polymesh-sdk/types';
import { assert } from 'console';

/**
 * This script shows how to create a Venue for a settlement.
 * Params include description, type and optional signers (allowed accounts to sign off chain receipts)
 */
export const createVenue = async (
  sdk: Polymesh,
  createVenueParams: CreateVenueParams = {
    description: 'Example Venue',
    type: VenueType.Exchange,
  }
): Promise<Venue> => {
  const venueTx = await sdk.settlements.createVenue(createVenueParams);
  const venue = await venueTx.run();
  assert(venueTx.isSuccess);

  if (createVenueParams.signers?.length) {
    const allowedSigners = await venue.getAllowedSigners();

    assert(
      allowedSigners.map(({ address }) => createVenueParams.signers?.includes(address)),
      'signers are added to the Venue'
    );
  }
  return venue;
};

/**
 * This script shows -
 *   1. how to get details for a venue
 *   2. how to get all venues created by an identity
 */
export const assertVenueOwnerAndDetails = async (
  venue: Venue,
  signingIdentity: Identity
): Promise<void> => {
  const venueDetails = await venue.details();
  assert(venueDetails.owner.did === signingIdentity.did, 'default signer should own the Venue');

  /* An Identities Venues can be fetched */
  const venues = await signingIdentity.getVenues();
  assert(
    venues.some(({ id }) => id.eq(venue.id)),
    'The created venue should be returned'
  );
};
