import "tsconfig-paths/register"; // (Solution from)[https://github.com/facebook/jest/issues/11644#issuecomment-1171646729]

import { RestClient } from "~/rest";
import { VaultClient } from "~/vault";
import { env } from "../environment";

const maxWorkersSupported = 8;

const initialPolyx = 500000;

export default async (): Promise<void> => {
  const vaultClient = new VaultClient(
    env.vaultUrl,
    env.vaultTransitPath,
    env.vaultToken
  );
  const restClient = new RestClient(env.restApi);

  const adminSigners = [...Array(maxWorkersSupported)].map(
    (_, index) => `${index + 1}-admin`
  );

  const keys = await Promise.all(
    adminSigners.map((s) => vaultClient.createKey(s))
  );

  const ids = await Promise.all(
    keys.map(({ address }) => restClient.accounts.getIdentity(address))
  );

  // Filter accounts to only include those without existing identities
  const accountsToCreate = keys
    .map(({ address }, index) => ({ address, initialPolyx, id: ids[index] }))
    .filter(({ id }) => !id)
    .map(({ address, initialPolyx }) => ({ address, initialPolyx }));

  if (accountsToCreate.length === 0) {
    return;
  }

  await restClient.identities.createTestAdmins(accountsToCreate);
};
