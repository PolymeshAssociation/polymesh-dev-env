import 'tsconfig-paths/register'; // (Solution from)[https://github.com/facebook/jest/issues/11644#issuecomment-1171646729]

import { RestClient } from '~/rest';
import { Identity } from '~/rest/identities';
import { RestErrorResult, ResultSet } from '~/rest/interfaces';
import { VaultClient } from '~/vault';

import { env } from '../environment';

const maxWorkersSupported = 8;

// Do not raise this. create-test-admins transfers from a finite source account,
// and asking for more than it holds fails the whole call on chain with
// FundsUnavailable. 8 x 1_000_000 is the largest total observed to succeed;
// 8 x 2_500_000 and 8 x 10_000_000 both failed outright, which left every admin
// with nothing and the entire suite failing on transaction fees.
//
// Headroom for the suite comes from the other side of the ledger instead: each
// identity costs `startingPolyx` in helpers/factory.ts, which is sized well
// below this budget.
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

  // Without this check a funding failure here is silent, and every suite then
  // fails far away with "does not have enough POLYX balance to pay this
  // transaction's fees" instead of pointing at the setup that caused it.
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
