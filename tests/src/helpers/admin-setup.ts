import 'tsconfig-paths/register'; // (Solution from)[https://github.com/facebook/jest/issues/11644#issuecomment-1171646729]

import { RestClient } from '~/rest';
import { Identity } from '~/rest/identities';
import { RestErrorResult, ResultSet } from '~/rest/interfaces';
import { VaultClient } from '~/vault';

import { env } from '../environment';

const maxWorkersSupported = 8;

// Each worker's admin funds every identity its suites create, at 100_000 POLYX
// a piece (`startingPolyx` in helpers/factory.ts) plus fees. The suite creates
// ~80 identities, so at 1_000_000 the budget was exactly 100% subscribed: an
// admin could afford 10 identities and averaged 10, leaving any worker handed
// an above-average share of suites to fail with "Insufficient free balance".
//
// There is a ceiling at the other end: the source funding these admins cannot
// cover 8 x 10_000_000, and create-test-admins fails outright when asked to.
// 8 x 2_500_000 keeps the total at 20_000_000, which the environment's own
// setup already funds in one call (scripts/rest-api-accounts-init.sh), while
// giving each admin room for 25 identities against the 10 it averages.
const startingPolyx = 2500000;

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
