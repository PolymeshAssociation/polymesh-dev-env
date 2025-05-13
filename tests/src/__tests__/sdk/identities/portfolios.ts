import { BigNumber, Polymesh } from "@polymeshassociation/polymesh-sdk";
import { FungibleAsset } from "@polymeshassociation/polymesh-sdk/types";

import { TestFactory } from "~/helpers";
import { createAsset } from "~/sdk/assets/createAsset";
import { managePortfolios } from "~/sdk/identities/portfolios";

let factory: TestFactory;

describe("managePortfolios", () => {
  let sdk: Polymesh;
  let asset: FungibleAsset;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    asset = await createAsset(sdk, { initialSupply: new BigNumber(1000) });
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should execute managePortfolios without errors", async () => {
    await expect(managePortfolios(sdk, asset)).resolves.not.toThrow();
  });
});
