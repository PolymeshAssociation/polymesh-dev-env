import { Polymesh } from "@polymeshassociation/polymesh-sdk";
import { KnownAssetType } from "@polymeshassociation/polymesh-sdk/types";
import assert from "assert";

/*
  This function showcases ticker reservation related functionality. It:
    - Reserves a Asset with the specified ticker
    - Fetches its details
    - Creates the Asset
*/
export const tickerReservation = async (
  sdk: Polymesh,
  ticker: string
): Promise<void> => {
  const identity = await sdk.getSigningIdentity();
  assert(identity);

  const { account: signingAccount } = await identity.getPrimaryAccount();

  // Prepare the reservation transaction. Note, this call will validate the ticker is available
  const reserveTx = await sdk.assets.reserveTicker(
    {
      ticker,
    },
    { signingAccount }
  );

  // Reserve the ticker
  const reservation = await reserveTx.run();
  assert(reserveTx.isSuccess);

  // the Reservation has methods to get its details, or to finish creating the Asset
  const { expiryDate, owner } = await reservation.details();
  assert(
    owner?.did === identity.did,
    `The owner of the Reservation for ${ticker} should be the signer of the transaction. Compared owner: ${owner?.did} to identity: ${identity.did}`
  );
  assert(
    expiryDate && expiryDate > new Date(),
    "The expiry date should be a defined date in the future"
  );

  // Prepare and run the create Asset transaction
  const createAssetTx = await reservation.createAsset(
    {
      name: "Reservation Demo",
      isDivisible: true,
      assetType: KnownAssetType.EquityCommon,
    },
    { signingAccount }
  );
  await createAssetTx.run();
  assert(createAssetTx.isSuccess);

  // Fetch the Reservation details after the Asset has been created
  const { expiryDate: expiryAfterCreate } = await reservation.details();
  assert(!expiryAfterCreate, "The expiry after Asset creation should be null");
};
