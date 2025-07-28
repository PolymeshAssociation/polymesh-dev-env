import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { registerCustomClaimTypeParams } from '~/rest/claims/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';

const handles = ['issuer'];
let factory: TestFactory;

describe('CustomClaimType', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let name: string;
  let txHash: string;
  let expectGetCustomClaimType: Record<string, unknown>;
  let id: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);

    name = factory.nextTicker();
    signer = issuer.signer;

    expectGetCustomClaimType = {
      name: expect.stringContaining(name),
      id: expect.any(String),
    };
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should register CustomClaimType', async () => {
    const params = registerCustomClaimTypeParams(name, {
      options: { signer, processMode: ProcessMode.Submit },
    });
    const txData = await restClient.claims.registerCustomClaimType(params);

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'identity.registerCustomClaimType',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });

    txHash = txData.transactions[0].transactionHash;
  });

  it('should return a paginated list of registered CustomClaimTypes', async () => {
    await restClient.pingForTransaction(txHash, 10);

    const result = await restClient.claims.getCustomClaimTypes();

    const expectCustomClaimType = {
      name: expect.stringMatching(/.*/),
      id: expect.stringMatching(/.*/),
      did: expect.stringMatching(/0x.*/),
    };

    expect(result).toMatchObject({
      results: expect.arrayContaining([expectCustomClaimType]),
      total: expect.any(String),
    });
  });

  it('should return a registered CustomClaimType by name', async () => {
    await restClient.pingForTransaction(txHash, 10);

    const result = await restClient.claims.getCustomClaimType(name);

    id = result.id;
    expect(result).toMatchObject(expectGetCustomClaimType);
    expect(result).toHaveProperty('name', name);
  });

  it('should return a registered CustomClaimType by id', async () => {
    await restClient.pingForTransaction(txHash, 10);

    const result = await restClient.claims.getCustomClaimType(id);

    expect(result).toMatchObject(expectGetCustomClaimType);
    expect(result).toHaveProperty('name', name);
  });

  it('should throw a NotFound for CustomClaimType that does not exit', async () => {
    const result = await restClient.claims.getCustomClaimType('202102');

    expect(result).toMatchObject({
      error: 'Not Found',
      message: expect.stringContaining('Custom claim type not found'),
      statusCode: 404,
    });
  });
});
