import { BigNumber, Polymesh } from "@polymeshassociation/polymesh-sdk";
import { KnownAssetType } from "@polymeshassociation/polymesh-sdk/types";

import { TestFactory } from "~/helpers";
import { manageDistributions } from "~/sdk/assets/manageDistributions";

let factory: TestFactory;

describe("manageDividends", () => {
  let ticker: string;
  let distributionTicker: string;
  let sdk: Polymesh;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    ticker = factory.nextTicker();
    distributionTicker = factory.nextTicker();

    const assetParams = {
      name: "Dividends test",
      isDivisible: false,
      assetType: KnownAssetType.EquityCommon,
      requireInvestorUniqueness: false,
      initialSupply: new BigNumber(100),
    };

    sdk = factory.polymeshSdk;

    const createOne = await sdk.assets.createAsset({
      ticker,
      ...assetParams,
    });

    await createOne.run();

    const createTwo = await sdk.assets.createAsset({
      ticker: distributionTicker,
      ...assetParams,
      initialSupply: new BigNumber(1000),
    });

    await createTwo.run();
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should execute without errors", async () => {
    await expect(
      manageDistributions(sdk, ticker, distributionTicker)
    ).resolves.not.toThrow();
  });
});
