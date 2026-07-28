import 'tsconfig-paths/register'; // (Solution from)[https://github.com/facebook/jest/issues/11644#issuecomment-1171646729]

import { RestClient } from '~/rest';
import { VaultClient } from '~/vault';

import { env } from '../environment';

const maxWorkersSupported = 8;

// Each worker's admin funds every identity its suites create, at 100_000 POLYX
// a piece (`startingPolyx` in helpers/factory.ts) plus fees. The suite creates
// ~80 identities, so at 1_000_000 the budget was exactly 100% subscribed: an
// admin could afford 10 identities and averaged 10, leaving any worker handed
// an above-average share of suites to fail with "Insufficient free balance".
// Keep well clear of that ceiling; this is a dev chain and the POLYX is minted.
const startingPolyx = 10000000;

export default async (): Promise<void> => {
  const vaultClient = new VaultClient(env.vaultUrl, env.vaultTransitPath, env.vaultToken);
  const restClient = new RestClient(env.restApi);

  const adminSigners = [...Array(maxWorkersSupported)].map((_, index) => `${index + 1}-admin`);

  const keys = await Promise.all(adminSigners.map((s) => vaultClient.createKey(s)));

  const accounts = keys.map(({ address }) => ({
    address,
    initialPolyx: startingPolyx,
  }));

  // Idempotent on v8: registers missing identities and (re)funds POLYX each run
  await restClient.identities.createTestAdmins(accounts);
};
