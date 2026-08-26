import { env } from '~/environment';
import { RestClient } from '~/rest';

describe('Accounts Treasury Balance', () => {
  let restClient: RestClient;

  beforeAll(() => {
    restClient = new RestClient(env.restApi);
  });

  describe('GET /accounts/treasury/balance', () => {
    it('should successfully retrieve treasury balance', async () => {
      const treasuryBalance = await restClient.accounts.getTreasuryBalance();

      expect(treasuryBalance).toBeDefined();
      expect(treasuryBalance).toHaveProperty('balance');
      expect(typeof treasuryBalance.balance).toBe('string');
      // chain v8 balances can carry sub-unit precision (e.g. "49999999.999999")
      expect(treasuryBalance.balance).toMatch(/^\d+(\.\d+)?$/);
    });
  });
});
