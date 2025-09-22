import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { KnownNftType, MetadataType } from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

import { createAsset } from '~/sdk/assets/createAsset';
import { createNftCollection } from '~/sdk/assets/createNftCollection';

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

  const transferTx = await sdk.settlements.addInstruction({
    legs: [{ asset, from: signerIdentity, to: targetDid, amount: new BigNumber(1000) }],
    venueId: undefined,
  });
  const instruction = await transferTx.run();
  assert(transferTx.isSuccess);

  // affirm instruction
  const { pending } = await counterParty.getInstructions();
  const counterInstruction = pending.find(({ id }) => id.eq(instruction.id));
  assert(counterInstruction, 'the counter party should have the instruction as pending');

  const affirmTx = await counterInstruction.affirm({}, { signingAccount: counterPartyAccount });
  await affirmTx.run();
  assert(affirmTx.isSuccess);

  const controllerTransferTx = await asset.controllerTransfer({
    originPortfolio: targetDid,
    amount: new BigNumber(100),
  });
  await controllerTransferTx.run();

  assert(controllerTransferTx.isSuccess);

  const assetHolders = await asset.assetHolders.get();

  const heldByIssuer = assetHolders.data.find(({ identity }) => identity.isEqual(signerIdentity));
  assert(heldByIssuer);
  expect(heldByIssuer.balance.eq(new BigNumber(1100)));

  const heldByCounterParty = assetHolders.data.find(({ identity }) => identity.did === targetDid);
  assert(heldByCounterParty);
  expect(heldByCounterParty.balance.eq(new BigNumber(900)));
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

  const transferTx = await sdk.settlements.addInstruction({
    legs: [{ asset: collection, nfts: [nft, nft2], from: signerIdentity, to: targetDid }],
    venueId: undefined,
  });
  const instruction = await transferTx.run();
  assert(transferTx.isSuccess);

  // affirm instruction
  const { pending } = await counterParty.getInstructions();
  const counterInstruction = pending.find(({ id }) => id.eq(instruction.id));
  assert(counterInstruction, 'the counter party should have the instruction as pending');

  const affirmTx = await counterInstruction.affirm({}, { signingAccount: counterPartyAccount });
  await affirmTx.run();
  assert(affirmTx.isSuccess);

  const controllerTransferTx = await collection.controllerTransfer({
    originPortfolio: targetDid,
    nfts: [nft],
  });
  await controllerTransferTx.run();

  assert(controllerTransferTx.isSuccess);

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
