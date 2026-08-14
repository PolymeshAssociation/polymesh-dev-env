import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { ClaimType, Identity } from '@polymeshassociation/polymesh-sdk/types';

import { wellKnown } from '~/consts';
import { TestFactory } from '~/helpers';

let factory: TestFactory;

describe('registerDid', () => {
  let sdk: Polymesh;
  let registrar: Identity;
  let registrarAddress: string;
  let signingIdentity: Identity;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    const identity = await sdk.getSigningIdentity();
    if (!identity) {
      throw new Error('the SDK should have a signing Identity');
    }
    signingIdentity = identity;

    registrarAddress = factory.signingManager.addAccount({ mnemonic: wellKnown.alice.mnemonic });
    registrar = await sdk.identities.getIdentity({ did: wellKnown.alice.did });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should identify a DID Registrar', async () => {
    await expect(registrar.isDidRegistrar()).resolves.toBe(true);
  });

  it('should not identify a regular Identity as a DID Registrar', async () => {
    await expect(signingIdentity.isDidRegistrar()).resolves.toBe(false);
  });

  it('should register a DID for a target Account as a registrar', async () => {
    const targetAccount = factory.signingManager.addAccount({
      mnemonic: LocalSigningManager.generateAccount(),
    });

    const registerTx = await sdk.identities.registerDid(
      { targetAccount },
      { signingAccount: registrarAddress }
    );

    const newIdentity = await registerTx.run();

    expect(registerTx.isSuccess).toBe(true);
    expect(newIdentity.did).toEqual(expect.any(String));

    const account = await sdk.accountManagement.getAccount({ address: targetAccount });
    const linkedIdentity = await account.getIdentity();

    expect(linkedIdentity?.did).toEqual(newIdentity.did);
  });

  it('should reject registering a DID for an Account that already has one', async () => {
    const { account } = await signingIdentity.getPrimaryAccount();

    await expect(
      sdk.identities.registerDid(
        { targetAccount: account.address },
        { signingAccount: registrarAddress }
      )
    ).rejects.toThrow();
  });

  it('should reject registering a DID when the signer is not a DID Registrar', async () => {
    const targetAccount = factory.signingManager.addAccount({
      mnemonic: LocalSigningManager.generateAccount(),
    });

    await expect(sdk.identities.registerDid({ targetAccount })).rejects.toThrow();
  });

  it('should require the DID Registrar role to issue a CDD claim', async () => {
    const claims = [
      {
        target: signingIdentity,
        claim: { type: ClaimType.CustomerDueDiligence, id: '0x01'.padEnd(66, '0') } as const,
      },
    ];

    // the role check rejects a non registrar before the transaction is prepared
    await expect(sdk.claims.addClaims({ claims })).rejects.toThrow(/required roles/);

    const addClaimsTx = await sdk.claims.addClaims(
      { claims },
      { signingAccount: registrarAddress }
    );
    await addClaimsTx.run();

    expect(addClaimsTx.isSuccess).toBe(true);
  });
});
