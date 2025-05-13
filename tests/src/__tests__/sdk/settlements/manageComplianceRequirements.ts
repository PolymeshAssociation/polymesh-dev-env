import { Polymesh } from "@polymeshassociation/polymesh-sdk";
import { FungibleAsset } from "@polymeshassociation/polymesh-sdk/types";

import { TestFactory } from "~/helpers";
import { createAsset } from "~/sdk/assets/createAsset";
import { manageComplianceRequirements } from "~/sdk/settlements/manageComplianceRequirements";

let factory: TestFactory;

describe("manageComplianceRequirements", () => {
  let asset: FungibleAsset;
  let sdk: Polymesh;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    asset = await createAsset(sdk, {});
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should execute without errors", async () => {
    await manageComplianceRequirements(sdk, asset);
  });
});
