import { LocalSigningManager } from "@polymeshassociation/local-signing-manager";
import { Polymesh } from "@polymeshassociation/polymesh-sdk";

import { TestFactory } from "~/helpers";
import {
  manageSecondaryKeys,
  modifyPermissions,
} from "~/sdk/identities/manageSecondaryKeys";

let factory: TestFactory;

describe("manageSecondaryKeys", () => {
  let sdk: Polymesh;
  let targetAddress: string;

  beforeAll(async () => {
    factory = await TestFactory.create({});

    const mnemonic = LocalSigningManager.generateAccount();
    targetAddress = factory.signingManager.addAccount({ mnemonic });

    sdk = factory.polymeshSdk;
  });

  afterAll(async () => {
    await factory.close();
  });

  it("should execute without errors", async () => {
    await expect(
      manageSecondaryKeys(sdk, targetAddress)
    ).resolves.not.toThrow();
    await expect(modifyPermissions(sdk, targetAddress)).resolves.not.toThrow();
  });
});
