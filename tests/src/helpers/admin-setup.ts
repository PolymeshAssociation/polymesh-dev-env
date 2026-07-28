import 'tsconfig-paths/register'; // (Solution from)[https://github.com/facebook/jest/issues/11644#issuecomment-1171646729]

import { RestClient } from '~/rest';
import { Identity } from '~/rest/identities';
import { RestErrorResult, ResultSet } from '~/rest/interfaces';
import { VaultClient } from '~/vault';

import { env } from '../environment';

const maxWorkersSupported = 8;

// Each Jest worker gets one admin, funded once here. Do not raise this:
// createTestAdmins transfers from a finite source account and fails the whole
// call with FundsUnavailable when asked for more than it holds. Headroom for
// the suites comes from the other side of the ledger, `startingPolyx` in
// helpers/factory.ts, which is sized well below this budget.
const startingPolyx = 1000000;

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
  const result = (await restClient.identities.createTestAdmins(accounts)) as
    | ResultSet<Identity>
    | RestErrorResult;

  // Fail here rather than let every suite fail later on transaction fees
  if ('statusCode' in result && result.statusCode >= 400) {
    throw new Error(`createTestAdmins failed (${result.statusCode}): ${result.message}`);
  }

  if (!('results' in result) || result.results?.length !== accounts.length) {
    throw new Error(
      `createTestAdmins funded ${('results' in result && result.results?.length) || 0} of ${
        accounts.length
      } admin accounts`
    );
  }
};
