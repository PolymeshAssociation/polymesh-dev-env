import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestErrorResult, RestSuccessResult } from '~/rest/interfaces';

type RegisteredIdentityResult = RestSuccessResult & { identity?: { did: string } };

const handles = ['nonRegistrar'];
let factory: TestFactory;

describe('POST /identities/register-did', () => {
  let restClient: RestClient;
  let adminSigner: string;
  let nonRegistrar: Identity;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    adminSigner = factory.getAdminSigner();
    nonRegistrar = factory.getSignerIdentity(handles[0]);
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should register a DID for a target Account as a registrar', async () => {
    const { address: targetAccount } = await factory.vaultClient.createKey(
      factory.prefixNonce('registerDidTarget')
    );

    const result = await restClient.identities.registerDid({
      targetAccount,
      options: { processMode: ProcessMode.Submit, signer: adminSigner },
    });

    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'identity.registerDid',
          ...expectBasicTxInfo,
        }),
      ]),
    });
    const did = (result as RegisteredIdentityResult).identity?.did;
    expect(did).toEqual(expect.any(String));

    const linkedDid = await restClient.accounts.getIdentity(targetAccount);
    expect(linkedDid).toEqual(did);
  });

  it('should reject registering a DID for an Account that already has one', async () => {
    const { address: existingAccount } = nonRegistrar.primaryAccount.account;

    const result = (await restClient.identities.registerDid({
      targetAccount: existingAccount,
      options: { processMode: ProcessMode.Submit, signer: adminSigner },
    })) as RestErrorResult;

    expect(result.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('should reject registering a DID when the signer is not a DID Registrar', async () => {
    const { address: targetAccount } = await factory.vaultClient.createKey(
      factory.prefixNonce('registerDidRejected')
    );

    const result = (await restClient.identities.registerDid({
      targetAccount,
      options: { processMode: ProcessMode.Submit, signer: nonRegistrar.signer },
    })) as RestErrorResult;

    expect(result.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('POST /identities/register', () => {
  let restClient: RestClient;
  let adminSigner: string;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    ({ restClient } = factory);
    adminSigner = factory.getAdminSigner();
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should register an Identity without createCdd or expiry, both now optional', async () => {
    const { address: targetAccount } = await factory.vaultClient.createKey(
      factory.prefixNonce('registerIdentityTarget')
    );

    const result = await restClient.identities.registerIdentity({
      targetAccount,
      options: { processMode: ProcessMode.Submit, signer: adminSigner },
    });

    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'identity.cddRegisterDid',
          ...expectBasicTxInfo,
        }),
      ]),
    });
    expect((result as RegisteredIdentityResult).identity?.did).toEqual(expect.any(String));
  });
});
