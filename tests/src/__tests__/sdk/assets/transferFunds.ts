import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  FungibleAsset,
  Identity,
  KnownNftType,
  MetadataType,
  NftCollection,
  NumberedPortfolio,
  ReceiverAffirmationRequirement,
} from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { createAsset } from '~/sdk/assets/createAsset';
import { createNftCollection } from '~/sdk/assets/createNftCollection';
import { createPortfolio } from '~/sdk/identities/portfolios';
import { randomNonce } from '~/util';

let factory: TestFactory;

describe('transferFunds', () => {
  let sdk: Polymesh;
  let asset: FungibleAsset;
  let collection: NftCollection;
  let sender: Identity;
  let senderPortfolio: NumberedPortfolio;
  let receiver: Identity;
  let receiverAddress: string;

  const amount = new BigNumber(10);

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    const signingIdentity = await sdk.getSigningIdentity();
    if (!signingIdentity) {
      throw new Error('the SDK should have a signing Identity');
    }
    sender = signingIdentity;

    receiverAddress = factory.signingManager.addAccount({
      mnemonic: LocalSigningManager.generateAccount(),
    });

    const {
      results: [{ did: receiverDid }],
    } = await factory.createIdentityForAddresses([receiverAddress]);

    receiver = await sdk.identities.getIdentity({ did: receiverDid });

    asset = await createAsset(sdk, {
      initialSupply: new BigNumber(1000),
      isDivisible: true,
    });

    collection = await createNftCollection(sdk, {
      ticker: factory.nextTicker(),
      nftType: KnownNftType.Derivative,
      collectionKeys: [
        {
          type: MetadataType.Local,
          name: 'img',
          spec: { url: 'https://example.com/nft/{id}' },
        },
      ],
    });

    const [pauseAssetCompliance, pauseCollectionCompliance] = await Promise.all([
      asset.compliance.requirements.pause(),
      collection.compliance.requirements.pause(),
    ]);

    await pauseAssetCompliance.run();
    await pauseCollectionCompliance.run();

    const issueNftTx = await collection.issue({
      metadata: [
        {
          type: MetadataType.Local,
          id: new BigNumber(1),
          value: 'https://example.com/nft/1',
        },
      ],
    });
    await issueNftTx.run();

    senderPortfolio = await createPortfolio(sdk, randomNonce(12));
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should settle immediately and resolve to undefined within the same Identity', async () => {
    const transferTx = await sdk.assets.transferFunds({
      asset,
      amount,
      from: await sender.portfolios.getPortfolio(),
      to: senderPortfolio,
    });

    const result = await transferTx.run();

    expect(transferTx.isSuccess).toBe(true);
    expect(result).toBeUndefined();

    const [{ total }] = await senderPortfolio.getAssetBalances({ assets: [asset] });
    expect(total).toEqual(amount);
  });

  it('should settle immediately when the receiver auto-affirms', async () => {
    await expect(receiver.isMandatoryReceiverAffirmationEnabled()).resolves.toBe(false);

    const transferTx = await sdk.assets.transferFunds({
      asset,
      amount,
      from: await sender.portfolios.getPortfolio(),
      to: await receiver.portfolios.getPortfolio(),
    });

    const result = await transferTx.run();

    expect(transferTx.isSuccess).toBe(true);
    expect(result).toBeUndefined();

    const [{ total }] = await (
      await receiver.portfolios.getPortfolio()
    ).getAssetBalances({ assets: [asset] });
    expect(total).toEqual(amount);
  });

  it('should resolve to a pending Instruction when the receiver must affirm', async () => {
    const requireAffirmationTx = await receiver.setMandatoryReceiverAffirmation(
      { requirement: ReceiverAffirmationRequirement.Required },
      { signingAccount: receiverAddress }
    );
    await requireAffirmationTx.run();

    expect(requireAffirmationTx.isSuccess).toBe(true);
    await expect(receiver.isMandatoryReceiverAffirmationEnabled()).resolves.toBe(true);

    const transferTx = await sdk.assets.transferFunds({
      asset,
      amount,
      from: await sender.portfolios.getPortfolio(),
      to: await receiver.portfolios.getPortfolio(),
      memo: 'awaiting affirmation',
    });

    const instruction = await transferTx.run();

    expect(transferTx.isSuccess).toBe(true);
    expect(instruction).toBeDefined();

    if (!instruction) {
      throw new Error(
        'a cross-Identity transfer awaiting affirmation should return an Instruction'
      );
    }

    await expect(instruction.isPending()).resolves.toBe(true);

    const affirmTx = await instruction.affirm({}, { signingAccount: receiverAddress });
    await affirmTx.run();

    expect(affirmTx.isSuccess).toBe(true);
  });

  it('should settle immediately again once the receiver pre-approves the asset', async () => {
    const preApproveTx = await asset.settlements.preApprove({ signingAccount: receiverAddress });
    await preApproveTx.run();

    expect(preApproveTx.isSuccess).toBe(true);
    await expect(receiver.isAssetPreApproved(asset)).resolves.toBe(true);

    const transferTx = await sdk.assets.transferFunds({
      asset,
      amount,
      from: await sender.portfolios.getPortfolio(),
      to: await receiver.portfolios.getPortfolio(),
    });

    const result = await transferTx.run();

    expect(transferTx.isSuccess).toBe(true);
    expect(result).toBeUndefined();
  });

  it('should transfer an NFT between Identities', async () => {
    const preApproveTx = await collection.settlements.preApprove({
      signingAccount: receiverAddress,
    });
    await preApproveTx.run();

    const transferTx = await sdk.assets.transferFunds({
      asset: collection,
      nfts: [new BigNumber(1)],
      from: await sender.portfolios.getPortfolio(),
      to: await receiver.portfolios.getPortfolio(),
    });

    const result = await transferTx.run();

    expect(transferTx.isSuccess).toBe(true);
    expect(result).toBeUndefined();

    const receiverPortfolio = await receiver.portfolios.getPortfolio();
    const holdings = await receiverPortfolio.getCollections({ collections: [collection] });

    expect(holdings[0].free.map(({ id }) => id.toNumber())).toContain(1);
  });
});
