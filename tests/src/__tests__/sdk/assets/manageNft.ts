import { LocalSigningManager } from "@polymeshassociation/local-signing-manager";
import { BigNumber, Polymesh } from "@polymeshassociation/polymesh-sdk";
import { Nft } from "@polymeshassociation/polymesh-sdk/internal";
import {
  DefaultPortfolio,
  Identity,
  Instruction,
  KnownNftType,
  MetadataType,
  NftCollection,
  NumberedPortfolio,
  Venue,
  VenueType,
} from "@polymeshassociation/polymesh-sdk/types";

import { TestFactory } from "~/helpers";
import { createNftCollection } from "~/sdk/assets/createNftCollection";
import { awaitMiddlewareSynced } from "~/util";

let factory: TestFactory;

describe("manageNft", () => {
  let ticker: string;
  let sdk: Polymesh;
  let collection: NftCollection;
  let nft: Nft;
  let venue: Venue;
  let holder: Identity;
  let portfolio: NumberedPortfolio;
  let defaultPortfolio: DefaultPortfolio;
  let receiver: Identity;
  let receiverAddress: string;
  let instruction: Instruction;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    ticker = factory.nextTicker();
    collection = await createNftCollection(sdk, {
      ticker,
      nftType: KnownNftType.Derivative,
      collectionKeys: [
        {
          type: MetadataType.Local,
          name: "img",
          spec: { url: "https://example.com/nft/{id}" },
        },
        {
          type: MetadataType.Local,
          name: "imgHash",
          spec: { description: "SHA256" },
        },
      ],
    });

    const targetMnemonic = LocalSigningManager.generateAccount();
    receiverAddress = factory.signingManager.addAccount({
      mnemonic: targetMnemonic,
    });

    const {
      results: [{ did: receiverDid }],
    } = await factory.createIdentityForAddresses([receiverAddress]);

    receiver = await sdk.identities.getIdentity({ did: receiverDid });

    const portfolioTx = await sdk.identities.createPortfolio({
      name: "NFT portfolio",
    });

    const venueTx = await sdk.settlements.createVenue({
      description: "test exchange",
      type: VenueType.Exchange,
    });

    const pauseTx = await collection.compliance.requirements.pause();

    const batchTx = await sdk.createTransactionBatch({
      transactions: [portfolioTx, venueTx, pauseTx] as const,
    });

    [portfolio, venue] = await batchTx.run();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    holder = (await sdk.getSigningIdentity())!;

    defaultPortfolio = await holder.portfolios.getPortfolio();
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should be defined", async () => {
    const details = await collection.details();
    expect(details.ticker).toEqual(ticker);
  });

  it("should return the needed metadata", async () => {
    const requiredMetadata = await collection.collectionKeys();

    expect(requiredMetadata).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "img", type: MetadataType.Local }),
        expect.objectContaining({ name: "imgHash", type: MetadataType.Local }),
      ])
    );
  });

  it("should issue an Nft", async () => {
    const issueTx = await collection.issue({
      metadata: [
        {
          type: MetadataType.Local,
          id: new BigNumber(1),
          value: "https://example.com/nft/1",
        },
        {
          type: MetadataType.Local,
          id: new BigNumber(2),
          value:
            "0x35987a0f9ae77012a5146a982966661b75cdeaa4161d1d62b1e18d39438e7396",
        },
      ],
    });

    nft = await issueTx.run();

    expect(nft.id).toEqual(new BigNumber(1));
  });

  it("should allow holder to transfer NFTs between portfolios", async () => {
    const moveTx = await defaultPortfolio.moveFunds({
      to: portfolio,
      items: [
        {
          asset: collection,
          nfts: [nft],
        },
      ],
    });

    await moveTx.run();

    const [defaultCollections, portfolioCollections] = await Promise.all([
      defaultPortfolio.getCollections(),
      portfolio.getCollections(),
    ]);

    expect(defaultCollections).toEqual([]);
    expect(portfolioCollections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: expect.objectContaining({ id: collection.id }),
          total: new BigNumber(1),
        }),
      ])
    );
  });

  it("should allow the holder to check if they can transfer the NFT", async () => {
    const { result } = await collection.settlements.canTransfer({
      from: portfolio,
      to: receiver,
      nfts: [nft],
    });

    expect(result).toEqual(true);
  });

  it("should let the holder send instructions with an NFT", async () => {
    const instructionTx = await sdk.settlements.addInstruction({
      venueId: venue.id,
      legs: [
        {
          from: portfolio,
          to: receiver,
          asset: collection,
          nfts: [nft],
        },
      ],
    });

    instruction = await instructionTx.run();

    await awaitMiddlewareSynced(instructionTx, sdk);
  });

  it("should return legs for an instruction when they contain an NFT", async () => {
    expect(instruction).toBeDefined();

    const { data: legs } = await instruction.getLegs();

    expect(legs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          asset: expect.objectContaining({ id: collection.id }),
          nfts: expect.arrayContaining([
            expect.objectContaining({ id: nft.id }),
          ]),
        }),
      ])
    );
  });

  it("should allow the receiver to accept an NFT settlement", async () => {
    const affirmTx = await instruction.affirm(
      {},
      { signingAccount: receiverAddress }
    );
    await affirmTx.run();

    const receiverPortfolio = await receiver.portfolios.getPortfolio();

    const receiverCollections = await receiverPortfolio.getCollections();

    expect(receiverCollections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: expect.objectContaining({
            id: collection.id,
          }),
          free: expect.arrayContaining([
            expect.objectContaining({ id: nft.id }),
          ]),
          total: new BigNumber(1),
        }),
      ])
    );
  });

  it("should allow the issuer to redeem an NFT", async () => {
    const createNftTx = await collection.issue({
      metadata: [
        {
          type: MetadataType.Local,
          id: new BigNumber(1),
          value: "https://example.com/nft/1",
        },
        {
          type: MetadataType.Local,
          id: new BigNumber(2),
          value: "0x1234",
        },
      ],
    });

    const redeemNft = await createNftTx.run();

    const redeemTx = await redeemNft.redeem();

    expect(redeemTx.run()).resolves.not.toThrow();
  });
});
