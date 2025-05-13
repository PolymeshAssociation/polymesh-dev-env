import { LocalSigningManager } from "@polymeshassociation/local-signing-manager";
import { Polymesh } from "@polymeshassociation/polymesh-sdk";
import { MultiSig } from "@polymeshassociation/polymesh-sdk/types";

import { TestFactory } from "~/helpers";
import { runMultiSigExamples } from "~/sdk/accountManagement/multiSig";

let factory: TestFactory;
const handles = ["creator"];

describe.skip("multiSig", () => {
  let sdk: Polymesh;
  let creator: string;
  let signerOne: string;
  let signerTwo: string;
  let multiSig: MultiSig;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    sdk = factory.polymeshSdk;

    const creatorId = factory.getSignerIdentity(handles[0]);
    creator = creatorId.primaryAccount.account.address;

    // make unattached accounts to serve as the signers
    const mnemonic = LocalSigningManager.generateAccount();

    signerOne = factory.signingManager.addAccount({
      mnemonic: `${mnemonic}/one`,
    });
    signerTwo = factory.signingManager.addAccount({
      mnemonic: `${mnemonic}/two`,
    });
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should execute multiSig without errors", async () => {
    console.log("signer addresses", { signerOne, signerTwo, creator });
    await expect(
      runMultiSigExamples(sdk, creator, signerOne, signerTwo)
    ).resolves.not.toThrow();
  });

  it("should be able to fetch the multiSig via signer", async () => {
    const signerOneAccount = await sdk.accountManagement.getAccount({
      address: signerOne,
    });
    const fetchedMultiSig = await signerOneAccount.getMultiSig();

    if (!fetchedMultiSig) {
      throw new Error("`signerOne.getMultiSig()` did not return a MultiSig");
    }

    multiSig = fetchedMultiSig;

    console.log("got multiSig", multiSig.address);
  });

  it("should fetch historical proposals from middleware", async () => {
    const historicalProposals = await multiSig.getHistoricalProposals({});

    expect(historicalProposals.data.length).toEqual(2);

    // expect(
    //   historicalProposals.data.some(({ status }) => status === ProposalStatus.Successful)
    // ).toEqual(true);
    // expect(
    //   historicalProposals.data.some(({ status }) => status === ProposalStatus.Rejected)
    // ).toEqual(true);
  });
});
