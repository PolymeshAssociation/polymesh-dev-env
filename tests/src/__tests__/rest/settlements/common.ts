import { expectBasicTxInfo } from "~/__tests__/rest/utils";
import { TestFactory } from "~/helpers";
import { RestClient } from "~/rest";
import { ProcessMode } from "~/rest/common";
import { Identity } from "~/rest/identities/interfaces";
import { venueParams } from "~/rest/settlements";

const handles = ["issuer", "collector"];
let factory: TestFactory;

describe("Settlements Common Methods", () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);

    signer = issuer.signer;
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should create a Venue", async () => {
    const params = venueParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    const txData = await restClient.settlements.createVenue(params);

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: "settlement.createVenue",
          type: "single",
          ...expectBasicTxInfo,
        },
      ]),
      venue: expect.any(String),
    });
  });
});
