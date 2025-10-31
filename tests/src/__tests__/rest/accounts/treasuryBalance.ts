import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';

describe('Accounts Treasury Balance', () => {
  let factory: TestFactory;
  let restClient: RestClient;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles: [] });
    ({ restClient } = factory);
  });

  afterAll(async () => {
    await factory.close();
  });

  describe('GET /accounts/treasury/balance', () => {
    it('should successfully retrieve treasury balance', async () => {
      const treasuryBalance = await restClient.accounts.getTreasuryBalance();

      expect(treasuryBalance).toBeDefined();
      expect(treasuryBalance).toHaveProperty('balance');
      expect(typeof treasuryBalance.balance).toBe('string');
      expect(treasuryBalance.balance).toMatch(/^\d+$/); // Should be a numeric string
    });
  });
});
