import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';

describe('Network Protocol Fees', () => {
  let factory: TestFactory;
  let restClient: RestClient;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles: [] });
    ({ restClient } = factory);
  });

  afterAll(async () => {
    await factory.close();
  });

  describe('GET /network/protocol-fees', () => {
    it('should contain expected corporate action fee', async () => {
      const protocolFees = await restClient.network.getProtocolFees({
        tags: ['corporateAction.initiateCorporateActionAndBallot'],
      });

      expect(Array.isArray(protocolFees)).toBe(true);

      // Look for the specific corporate action fee
      const corporateActionFee = protocolFees.find(
        (fee) => fee.tag === 'corporateAction.initiateCorporateActionAndBallot'
      );

      expect(corporateActionFee).toBeDefined();
      if (corporateActionFee) {
        expect(corporateActionFee).toHaveProperty('fee');
        expect(typeof corporateActionFee.fee).toBe('string');
        expect(corporateActionFee.fee).toMatch(/^\d+$/);
      }
    });
  });
});
