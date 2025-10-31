import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  FungibleAsset,
  OfferingBalanceStatus,
  OfferingSaleStatus,
  OfferingTimingStatus,
  SignerKeyRingType,
  VenueType,
} from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

import { addIsNotBlocked } from '~/sdk/settlements/util';

/*
  This script showcases Security Token Offering (STO) functionality. It:
  - Create a Venue and Portfolio dedicated to the offering
  - Launches an Offering
  - Modifies the start and end time
  - Fetches its details
  - Invests in it
  - Freezes/unfreezes it
  - Closes it
  - Fetches all investments made
*/
export const createSto = async (
  sdk: Polymesh,
  investorDid: string,
  offeringAsset: FungibleAsset,
  raisingAsset: FungibleAsset
): Promise<void> => {
  const [identity, investor] = await Promise.all([
    sdk.getSigningIdentity(),
    sdk.identities.getIdentity({ did: investorDid }),
  ]);
  assert(identity);

  // Get the investors portfolio and primary account
  const [investorPortfolio, { account: investorAccount }] = await Promise.all([
    investor.portfolios.getPortfolio(),
    investor.getPrimaryAccount(),
  ]);

  // Assets need non default compliance requirements to be moved
  await Promise.all([
    addIsNotBlocked(offeringAsset),
    addIsNotBlocked(raisingAsset, investorAccount.address),
  ]);

  // Create a Venue to use for the offering. An existing Venue could also be used
  // The investor account must be authorized as a signer for off-chain funding receipts
  const createVenueTx = await sdk.settlements.createVenue({
    description: 'Example Offering Venue',
    type: VenueType.Sto,
    signers: [investorAccount.address],
  });
  // Create a Portfolio to store raised funds in
  const createPortfolioTx = await sdk.identities.createPortfolio({
    name: 'Example STO',
  });
  // batch the transactions for efficiency
  const batchTx = await sdk.createTransactionBatch({
    transactions: [createVenueTx, createPortfolioTx] as const,
  });
  const [venue, raisingPortfolio] = await batchTx.run();
  assert(batchTx.isSuccess);

  // Provide equity from the identities default Portfolio
  const offeringPortfolio = await identity.portfolios.getPortfolio();

  const launchTx = await offeringAsset.offerings.launch({
    offeringPortfolio, // optional, defaults to the PIA's default portfolio
    raisingPortfolio,
    raisingCurrency: raisingAsset.id,
    venue, // optional, defaults to the first "Offering" type venue created by the owner of the Offering Portfolio
    name: 'Example STO',
    start: undefined, // optional, defaults to now
    end: new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000), // optional, defaults to never
    // tiers can incentivize early investors with a better rate
    tiers: [
      {
        price: new BigNumber(10),
        amount: new BigNumber(100),
      },
      {
        price: new BigNumber(12),
        amount: new BigNumber(100),
      },
    ],
    minInvestment: new BigNumber(10),
  });

  // Existing STOs can also later be fetched with `asset.offerings.get()`
  const offering = await launchTx.run();

  // Modify start/end times
  const modifySaleTimeTx = await offering.modifyTimes({
    end: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
  });
  await modifySaleTimeTx.run();
  assert(modifySaleTimeTx.isSuccess);

  // Fetch offering details
  const offeringDetails = await offering.details();
  assert(offeringDetails.status.sale === OfferingSaleStatus.Live, 'the offering should be live');

  // Fetch an investable offering for the asset
  const [{ offering: investableOffering }] = await offeringAsset.offerings.get({
    status: {
      timing: OfferingTimingStatus.Started,
      sale: OfferingSaleStatus.Live,
      balance: OfferingBalanceStatus.Available,
    },
  });

  // Assumes the investor has sufficient balance and is loaded into the SDK Signing Manager
  const investTx = await investableOffering.invest(
    {
      purchasePortfolio: investorPortfolio,
      fundingPortfolio: investorPortfolio,
      purchaseAmount: new BigNumber(10),
      maxPrice: new BigNumber(11),
    },
    { signingAccount: investorAccount }
  );

  await investTx.run();
  assert(investTx.isSuccess);

  let offChainFundingDetails = await investableOffering.offChainFundingDetails();
  assert(offChainFundingDetails.enabled === false, 'off chain funding should be disabled');

  const enableOffChainFundingTx = await investableOffering.enableOffChainFunding({
    offChainTicker: 'OFFCHAIN1234',
  });
  await enableOffChainFundingTx.run();
  assert(enableOffChainFundingTx.isSuccess);

  offChainFundingDetails = await investableOffering.offChainFundingDetails();
  assert(offChainFundingDetails.enabled === true, 'off chain funding should be enabled');
  assert(
    offChainFundingDetails.offChainTicker === 'OFFCHAIN1234',
    'off chain funding should be enabled'
  );

  const authChainFundingReceipt = await investableOffering.generateOffChainFundingReceipt({
    uid: new BigNumber(1),
    offChainTicker: 'OFFCHAIN1234',
    amount: new BigNumber(100),
    sender: investor,
    metadata: 'Off chain metadata',
    signer: investorAccount,
  });

  const offChainInvestTx = await investableOffering.invest(
    {
      offChainTicker: 'OFFCHAIN1234',
      offChainFundingReceipt: authChainFundingReceipt,
      purchasePortfolio: investorPortfolio,
      purchaseAmount: new BigNumber(10),
      maxPrice: new BigNumber(11),
    },
    { signingAccount: investorAccount }
  );

  await offChainInvestTx.run();
  assert(offChainInvestTx.isSuccess);

  // Freeze the offering
  const freezeTx = await offering.freeze();
  await freezeTx.run();
  assert(freezeTx.isSuccess);

  // Unfreeze
  const unfreezeTx = await offering.unfreeze();
  await unfreezeTx.run();
  assert(unfreezeTx.isSuccess);

  // Close
  const closeTx = await offering.close();
  await closeTx.run();
  assert(closeTx.isSuccess);

  // Fetch investments from the offering
  const { data: investments } = await offering.getInvestments();
  assert(investments.length > 0, 'the asset should have investments');
};
