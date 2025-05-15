import { expectBasicTxInfo } from "~/__tests__/rest/utils";
import { TestFactory } from "~/helpers";
import { RestClient } from "~/rest";
import { assetMediatorsParams, createAssetParams } from "~/rest/assets";
import { ProcessMode } from "~/rest/common";
import { Identity } from "~/rest/identities/interfaces";

const handles = ["issuer"];
let factory: TestFactory;

describe("AssetDocument", () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);

    signer = issuer.signer;

    assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    assetId = await restClient.assets.createAndGetAssetId(assetParams);
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should add asset mediators", async () => {
    const params = assetMediatorsParams([issuer.did], {
      options: { processMode: ProcessMode.Submit, signer },
    });
    const txData = await restClient.assets.addAssetMediators(assetId, params);

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: "asset.addMandatoryMediators",
          type: "single",
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it("should get the asset mediators", async () => {
    const result = await restClient.assets.getAssetMediators(assetId);

    expect(result).toEqual(
      expect.objectContaining({
        mediators: [issuer.did],
      })
    );
  });

  it("should remove asset mediators", async () => {
    const params = assetMediatorsParams([issuer.did], {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const txData = await restClient.assets.removeAssetMediators(
      assetId,
      params
    );

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: "asset.removeMandatoryMediators",
          type: "single",
          ...expectBasicTxInfo,
        },
      ]),
    });

    const result = await restClient.assets.getAssetMediators(assetId);

    expect(result).toEqual({
      mediators: [],
    });
  });
});
