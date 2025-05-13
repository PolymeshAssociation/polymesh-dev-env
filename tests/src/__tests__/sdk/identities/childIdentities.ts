import { LocalSigningManager } from "@polymeshassociation/local-signing-manager";
import { Polymesh } from "@polymeshassociation/polymesh-sdk";

import { TestFactory } from "~/helpers";
import {
  assertChildIdentity,
  createChildIdentity,
  removeChildIdentity,
} from "~/sdk/identities/childIdentities";
import { manageSecondaryKeys } from "~/sdk/identities/manageSecondaryKeys";

let factory: TestFactory;

describe("manageChildIdentities", () => {
  let sdk: Polymesh;
  let childAddress: string;

  beforeAll(async () => {
    factory = await TestFactory.create({});

    const mnemonic = LocalSigningManager.generateAccount();
    childAddress = factory.signingManager.addAccount({ mnemonic });

    sdk = factory.polymeshSdk;
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should execute without errors", async () => {
    await expect(manageSecondaryKeys(sdk, childAddress)).resolves.not.toThrow();

    const childIdentity = await createChildIdentity(sdk, childAddress);

    await expect(
      assertChildIdentity(sdk, childIdentity.did)
    ).resolves.not.toThrow();

    await expect(
      removeChildIdentity(sdk, childIdentity.did)
    ).resolves.not.toThrow();
  });
});
