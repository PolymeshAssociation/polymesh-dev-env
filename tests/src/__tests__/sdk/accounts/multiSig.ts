import { LocalSigningManager } from "@polymeshassociation/local-signing-manager";
import { BigNumber, Polymesh } from "@polymeshassociation/polymesh-sdk";
import {
  Account,
  MultiSig,
  TransactionStatus,
} from "@polymeshassociation/polymesh-sdk/types";

import { TestFactory } from "~/helpers";

let factory: TestFactory;
const handles = ["creator"];

describe("multiSig", () => {
  let sdk: Polymesh;
  let signerOne: Account;
  let signerTwo: Account;
  let multiSig: MultiSig;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    sdk = factory.polymeshSdk;

    // make unattached accounts to serve as the signers
    const mnemonic = LocalSigningManager.generateAccount();

    const signerOneAddr = factory.signingManager.addAccount({
      mnemonic: `${mnemonic}/one`,
    });
    const signerTwoAddr = factory.signingManager.addAccount({
      mnemonic: `${mnemonic}/two`,
    });

    [signerOne, signerTwo] = await Promise.all([
      sdk.accountManagement.getAccount({ address: signerOneAddr }),
      sdk.accountManagement.getAccount({ address: signerTwoAddr }),
    ]);
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should create a MultiSig", async () => {
    const createMultiSig = await sdk.accountManagement.createMultiSigAccount({
      signers: [signerOne, signerTwo],
      requiredSignatures: new BigNumber(2),
      permissions: { assets: null, transactions: null, portfolios: null },
    });

    const result = await createMultiSig.run();

    console.log("ran");

    expect(result).toEqual(
      expect.objectContaining({ address: expect.any(String) })
    );
  });

  it("should accept becoming the multi sig signers", async () => {
    const [signerOneAuths, signerTwoAuths] = await Promise.all([
      signerOne.authorizations.getReceived(),
      signerTwo.authorizations.getReceived(),
    ]);

    const [signerOneAccept, signerTwoAccept] = await Promise.all([
      signerOneAuths[0].accept({ signingAccount: signerOne }),
      signerTwoAuths[0].accept({ signingAccount: signerTwo }),
    ]);

    await Promise.all([
      await signerOneAccept.run(),
      await signerTwoAccept.run(),
    ]);
  });

  it("should create and accept a proposal", async () => {
    const createPortfolio = await sdk.identities.createPortfolio(
      {
        name: "MultiSig Portfolio",
      },
      { signingAccount: signerOne }
    );

    const portfolioProposal = await createPortfolio.runAsProposal();

    expect(createPortfolio.status).toEqual(TransactionStatus.Succeeded);

    const acceptProposal = await portfolioProposal.approve({
      signingAccount: signerTwo,
    });
    expect(acceptProposal.multiSig).toBeNull(); // multiSig should not be set
    await acceptProposal.run();

    expect(acceptProposal.status).toEqual(TransactionStatus.Succeeded);
  });

  it("should be able to fetch the multiSig via signer", async () => {
    const fetchedMultiSig = await signerOne.getMultiSig();

    expect(fetchedMultiSig).toBeDefined();

    multiSig = fetchedMultiSig!;
  });

  it("should fetch historical proposals from middleware", async () => {
    const historicalProposals = await multiSig.getHistoricalProposals();

    expect(historicalProposals.data.length).toEqual(1);
  });
});
