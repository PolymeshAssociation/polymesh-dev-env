import { Polymesh } from "@polymeshassociation/polymesh-sdk";
import { FungibleAsset } from "@polymeshassociation/polymesh-sdk/types";

import { TestFactory } from "~/helpers";
import { createAsset } from "~/sdk/assets/createAsset";
import { manageMetadata } from "~/sdk/assets/manageMetadata";

let factory: TestFactory;

describe("manageMetadata", () => {
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

  it("should execute manageMetadata without errors", async () => {
    await manageMetadata(sdk, asset);
  });
});
