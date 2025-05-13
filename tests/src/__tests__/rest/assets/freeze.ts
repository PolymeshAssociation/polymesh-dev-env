import { TransferError } from "@polymeshassociation/polymesh-sdk/types";

import { TestFactory } from "~/helpers";
import { RestClient } from "~/rest";
import { createAssetParams } from "~/rest/assets/params";
import { ProcessMode } from "~/rest/common";
import { Identity } from "~/rest/identities/interfaces";

const handles = ["issuer", "recipient"];
let factory: TestFactory;

describe("Freeze/unfreeze Asset", () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let recipient: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    recipient = factory.getSignerIdentity(handles[1]);

    signer = issuer.signer;

    assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should create and fetch the Asset", async () => {
    assetId = await restClient.assets.createAndGetAssetId(assetParams);

    const asset = await restClient.assets.getAsset(assetId);

    expect(asset).toMatchObject({
      name: assetParams.name,
      assetType: assetParams.assetType,
    });

    await restClient.compliance.pauseRequirements(assetId, {
      options: { processMode: ProcessMode.Submit, signer },
    });
  });

  it("should have issued the asset to the Default portfolio of the issuer", async () => {
    const result = await restClient.portfolios.getPortfolio(issuer.did, "0");

    expect(result).toEqual(
      expect.objectContaining({
        name: "default",
        assetBalances: [
          {
            asset: assetId,
            free: expect.any(String),
            locked: expect.any(String),
            total: expect.any(String),
          },
        ],
        id: "0",
        owner: issuer.did,
      })
    );
  });

  it("should freeze the Asset and get the isFrozen state as true", async () => {
    await restClient.assets.freeze(assetId, assetParams);

    const asset = await restClient.assets.getAsset(assetId);

    expect(asset).toMatchObject({
      name: assetParams.name,
      assetType: assetParams.assetType,
      isFrozen: true,
    });
  });

  it("should not allow transfers when frozen", async () => {
    const result = await restClient.settlements.validateLeg({
      asset: assetId,
      fromDid: issuer.did,
      toDid: recipient.did,
      amount: "100",
      fromPortfolio: "0",
      toPortfolio: "0",
    });

    expect(result).toMatchObject({
      result: false,
      general: [TransferError.TransfersFrozen],
    });
  });

  it("should unfreeze the Asset and get the isFrozen state as false", async () => {
    await restClient.assets.unfreeze(assetId, assetParams);

    const asset = await restClient.assets.getAsset(assetId);

    expect(asset).toMatchObject({
      name: assetParams.name,
      assetType: assetParams.assetType,
      isFrozen: false,
    });
  });

  it("should allow transfers when asset is unfrozen", async () => {
    const result = await restClient.settlements.validateLeg({
      asset: assetId,
      fromDid: issuer.did,
      toDid: recipient.did,
      amount: "100",
      fromPortfolio: "0",
      toPortfolio: "0",
    });

    expect(result).toMatchObject({
      result: true,
    });
  });
});
