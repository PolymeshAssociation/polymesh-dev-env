import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  Account,
  Instruction,
  KnownNftType,
  MetadataType,
  VenueType,
} from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

import { createAsset } from '~/sdk/assets/createAsset';
import { createNftCollection } from '~/sdk/assets/createNftCollection';
import { awaitMiddlewareSynced, sleep } from '~/util';

/**
 * Wait for an instruction the counter party only receives on to settle,
 * affirming as the receiver when the chain requires it.
 *
 * The submitter affirms on submission, and from chain v8 a party that only
 * receives is affirmed automatically unless it has opted in through
 * settlement.setMandatoryReceiverAffirmation. Such an instruction therefore
 * settles with no further action and never reaches the receiver's pending list.
 * Earlier chains need the receiver's affirmation before it can execute.
 */
const settleAsReceiver = async (
  instruction: Instruction,
  receiverAccount: Account,
  retries = 15,
  delay = 2000
): Promise<void> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (await instruction.isExecuted()) {
      return;
    }

    // An instruction with affirmations outstanding cannot execute, and the count
    // reads zero once it has, so this cannot race with settlement
    if ((await instruction.getPendingAffirmationCount()).gt(0)) {
      const affirmTx = await instruction.affirm({}, { signingAccount: receiverAccount });
      await affirmTx.run();
      assert(affirmTx.isSuccess, 'the receiver should be able to affirm the instruction');
    }

    await sleep(delay);
  }

  assert(await instruction.isExecuted(), 'the transfer instruction should have settled');
};

/*
  This script showcases VenueFiltering related functionality. It:
    - Creates an asset with initial supply
    - Transfers some of the asset to a new DID
    - Force controller transfer for soma part back to default portfolio
    - Creates new portfolio 
    - Force controller transfer to newly created portfolio
*/

export const fungibleAssetControllerTransfer = async (
  sdk: Polymesh,
  targetDid: string
): Promise<void> => {
  const asset = await createAsset(sdk, { initialSupply: new BigNumber(2000) });

  assert(asset);

  const [signerIdentity, counterParty] = await Promise.all([
    sdk.getSigningIdentity(),
    sdk.identities.getIdentity({ did: targetDid }),
  ]);
  assert(signerIdentity);
  const { account: counterPartyAccount } = await counterParty.getPrimaryAccount();

  const venueTx = await sdk.settlements.createVenue({
    description: 'Controller transfer venue',
    type: VenueType.Exchange,
  });
  const venue = await venueTx.run();
  assert(venueTx.isSuccess);

  // No end block, so the instruction settles as soon as it is fully affirmed.
  // The controller transfer below needs the counter party to hold the asset
  const transferTx = await venue.addInstruction({
    legs: [{ asset, from: signerIdentity, to: targetDid, amount: new BigNumber(1000) }],
  });
  const instruction = await transferTx.run();
  assert(transferTx.isSuccess);

  await settleAsReceiver(instruction, counterPartyAccount);

  const controllerTransferTx = await asset.controllerTransfer({
    originPortfolio: targetDid,
    amount: new BigNumber(100),
  });
  await controllerTransferTx.run();

  assert(controllerTransferTx.isSuccess);

  await awaitMiddlewareSynced(controllerTransferTx, sdk, 30, 3000);

  const assetHolders = await asset.assetHolders.get();

  const heldByIssuer = assetHolders.data.find(({ identity }) => identity.isEqual(signerIdentity));
  assert(heldByIssuer);
  expect(heldByIssuer.balance.toNumber()).toEqual(1100);

  const heldByCounterParty = assetHolders.data.find(({ identity }) => identity.did === targetDid);
  assert(heldByCounterParty);
  expect(heldByCounterParty.balance.toNumber()).toEqual(900);
};

/*
  This script showcases VenueFiltering related functionality. It:
    - Creates an asset with initial supply
    - Transfers some of the asset to a new DID
    - Force controller transfer for soma part back to default portfolio
    - Creates new portfolio 
    - Force controller transfer to newly created portfolio
*/
export const nonFungibleAssetControllerTransfer = async (
  sdk: Polymesh,
  targetDid: string
): Promise<void> => {
  const collection = await createNftCollection(sdk, {
    ticker: 'TEST',
    nftType: KnownNftType.Derivative,
  });

  assert(collection);

  const [signerIdentity, counterParty] = await Promise.all([
    sdk.getSigningIdentity(),
    sdk.identities.getIdentity({ did: targetDid }),
  ]);
  assert(signerIdentity);
  assert(counterParty);

  const { account: counterPartyAccount } = await counterParty.getPrimaryAccount();

  const issueTx = await collection.issue({
    metadata: [
      {
        type: MetadataType.Local,
        id: new BigNumber(1),
        value: 'https://example.com/nft/1',
      },
      {
        type: MetadataType.Local,
        id: new BigNumber(2),
        value: '0x35987a0f9ae77012a5146a982966661b75cdeaa4161d1d62b1e18d39438e7396',
      },
    ],
  });

  const nft = await issueTx.run();

  expect(nft.id).toEqual(new BigNumber(1));

  const issueTx2 = await collection.issue({
    metadata: [
      {
        type: MetadataType.Local,
        id: new BigNumber(1),
        value: 'https://example.com/nft/1',
      },
      {
        type: MetadataType.Local,
        id: new BigNumber(2),
        value: '0x35987a0f9ae77012a5146a982966661b75cdeaa4161d1d62b1e18d39438e7396',
      },
    ],
  });

  const nft2 = await issueTx2.run();

  const venueTx = await sdk.settlements.createVenue({
    description: 'Controller transfer venue',
    type: VenueType.Exchange,
  });
  const venue = await venueTx.run();
  assert(venueTx.isSuccess);

  // No end block, so the instruction settles as soon as it is fully affirmed.
  // The controller transfer below needs the counter party to hold the NFTs
  const transferTx = await venue.addInstruction({
    legs: [{ asset: collection, nfts: [nft, nft2], from: signerIdentity, to: targetDid }],
  });
  const instruction = await transferTx.run();
  assert(transferTx.isSuccess);

  await settleAsReceiver(instruction, counterPartyAccount);

  const controllerTransferTx = await collection.controllerTransfer({
    originPortfolio: targetDid,
    nfts: [nft],
  });
  await controllerTransferTx.run();

  assert(controllerTransferTx.isSuccess);

  await awaitMiddlewareSynced(controllerTransferTx, sdk);

  const assetHolders = await collection.assetHolders.get({});

  let heldByIssuer = assetHolders.data.find(({ identity }) => identity.isEqual(signerIdentity));
  assert(heldByIssuer);
  expect(heldByIssuer.nfts.length).toEqual(1);
  expect(heldByIssuer.nfts[0].id.eq(nft.id));

  let heldByCounterParty = assetHolders.data.find(({ identity }) => identity.did === targetDid);
  assert(heldByCounterParty);
  expect(heldByCounterParty.nfts.length).toEqual(1);
  expect(heldByCounterParty.nfts[0].id.eq(nft2.id));

  const createPortfolioTx = await sdk.identities.createPortfolio({
    name: 'PORTFOLIO',
  });
  const portfolio = await createPortfolioTx.run();
  assert(createPortfolioTx.isSuccess);

  const controllerTransferTx2 = await collection.controllerTransfer({
    originPortfolio: { identity: signerIdentity, id: portfolio.id },
    nfts: [nft2],
  });
  await controllerTransferTx2.run();

  assert(controllerTransferTx2.isSuccess);

  await awaitMiddlewareSynced(controllerTransferTx2, sdk);

  const assetHolders2 = await collection.assetHolders.get({});

  heldByIssuer = assetHolders2.data.find(({ identity }) => identity.isEqual(signerIdentity));
  assert(heldByIssuer);
  expect(heldByIssuer.nfts.length).toEqual(2);

  heldByCounterParty = assetHolders2.data.find(({ identity }) => identity.did === targetDid);
  expect(heldByCounterParty).toBeUndefined();

  const portfolioCollections = await portfolio.getCollections({ collections: [collection] });

  expect(portfolioCollections.length).toEqual(1);
  expect(portfolioCollections[0].collection.id).toEqual(collection.id);
  expect(portfolioCollections[0].free.length).toEqual(1);
  expect(portfolioCollections[0].free[0].id).toEqual(nft2.id);
};
