import { LocalSigningManager } from "@polymeshassociation/local-signing-manager";
import { BigNumber, Polymesh } from "@polymeshassociation/polymesh-sdk";
import { FungibleAsset } from "@polymeshassociation/polymesh-sdk/types";

import { TestFactory } from "~/helpers";
import { createAsset } from "~/sdk/assets/createAsset";
import { createSto } from "~/sdk/settlements/createSto";

let factory: TestFactory;

describe("createSto", () => {
  let offeringAsset: FungibleAsset;
  let raisingAsset: FungibleAsset;
  let investorDid: string;
  let sdk: Polymesh;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    const targetMnemonic = LocalSigningManager.generateAccount();
    const investorAddress = factory.signingManager.addAccount({
      mnemonic: targetMnemonic,
    });

    ({
      results: [{ did: investorDid }],
    } = await factory.createIdentityForAddresses([investorAddress]));

    const initialSupply = new BigNumber(1000);
    [offeringAsset, raisingAsset] = await Promise.all([
      createAsset(sdk, { initialSupply }),
      createAsset(sdk, { initialSupply }, { signingAccount: investorAddress }),
    ]);
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should execute without errors", async () => {
    await createSto(sdk, investorDid, offeringAsset, raisingAsset);
  });
});
