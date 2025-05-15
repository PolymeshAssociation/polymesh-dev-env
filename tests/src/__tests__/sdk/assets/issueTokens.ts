import { BigNumber, Polymesh } from "@polymeshassociation/polymesh-sdk";
import {
  FungibleAsset,
  NumberedPortfolio,
} from "@polymeshassociation/polymesh-sdk/types";

import { TestFactory } from "~/helpers";
import { createAsset } from "~/sdk/assets/createAsset";
import { getAssetHolders } from "~/sdk/assets/getAssetHolders";
import { issueTokens } from "~/sdk/assets/issueTokens";
import { createPortfolio } from "~/sdk/identities/portfolios";
import { randomNonce } from "~/util";

let factory: TestFactory;

describe("issueTokens", () => {
  let asset: FungibleAsset;
  let sdk: Polymesh;
  let portfolio: NumberedPortfolio;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    portfolio = await createPortfolio(sdk, randomNonce(12));

    asset = await createAsset(sdk, {});
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should execute issueTokens without errors", async () => {
    await expect(issueTokens(asset, new BigNumber(100))).resolves.not.toThrow();
  });

  it("should get asset holders", async () => {
    await expect(getAssetHolders(asset)).resolves.not.toThrow();
  });

  it("should execute issueTokens for issuing in a specific portfolio without errors", async () => {
    await expect(
      issueTokens(asset, new BigNumber(100), portfolio.id)
    ).resolves.not.toThrow();
  });
});
