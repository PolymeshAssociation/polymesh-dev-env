import { BigNumber, Polymesh } from "@polymeshassociation/polymesh-sdk";
import {
  FungibleAsset,
  NumberedPortfolio,
} from "@polymeshassociation/polymesh-sdk/types";

import { TestFactory } from "~/helpers";
import { createAsset } from "~/sdk/assets/createAsset";
import { getAssetHolders } from "~/sdk/assets/getAssetHolders";
import { issueTokens } from "~/sdk/assets/issueTokens";
import { redeemTokens } from "~/sdk/assets/redeemTokens";
import { createPortfolio } from "~/sdk/identities/portfolios";
import { randomNonce } from "~/util";

let factory: TestFactory;

describe("issueAndRedeemTokens", () => {
  let asset: FungibleAsset;
  let portfolio: NumberedPortfolio;
  let sdk: Polymesh;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    portfolio = await createPortfolio(sdk, randomNonce(12));

    asset = await createAsset(sdk, {
      initialSupply: new BigNumber(100),
      portfolioId: portfolio.id,
    });
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

  it("should execute redeemTokens without errors", async () => {
    await expect(redeemTokens(asset, new BigNumber(5))).resolves.not.toThrow();
  });

  it("should execute redeemTokens from a portfolio other than default portfolio without errors", async () => {
    await expect(
      redeemTokens(asset, new BigNumber(5), portfolio)
    ).resolves.not.toThrow();
  });
});
