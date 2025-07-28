import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';

import { TestFactory } from '~/helpers';
import { portfolioCustody } from '~/sdk/identities/portfolioCustody';

let factory: TestFactory;

describe('portfolioCustody', () => {
  let sdk: Polymesh;
  let custodianDid: string;

  beforeAll(async () => {
    factory = await TestFactory.create({});

    const mnemonic = LocalSigningManager.generateAccount();
    const custodianAddress = factory.signingManager.addAccount({ mnemonic });
    sdk = factory.polymeshSdk;

    ({
      results: [{ did: custodianDid }],
    } = await factory.createIdentityForAddresses([custodianAddress]));
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should execute portfolioCustody without errors', async () => {
    await expect(portfolioCustody(sdk, custodianDid)).resolves.not.toThrow();
  });
});
