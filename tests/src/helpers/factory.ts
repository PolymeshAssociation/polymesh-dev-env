import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';

import { env } from '~/environment';
import { TestFactoryOpts } from '~/helpers/types';
import { RestClient } from '~/rest';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities';
import { RestErrorResult, ResultSet } from '~/rest/interfaces';
import { alphabet, randomNonce } from '~/util';
import { VaultClient } from '~/vault';

const nonceLength = 9;
// Paid by the worker's admin for every identity a suite creates, out of the
// budget it is given in helpers/admin-setup.ts. Keep it well clear of what a
// suite actually spends, protocol fees are 2_500 to create an asset and 500 for
// a ticker, and no test moves more than 1_000 POLYX.
const startingPolyx = 25000;
const { nodeUrl, vaultUrl, vaultToken, vaultTransitPath } = env;

export class TestFactory {
  public nonce: string;
  public restClient: RestClient;
  public vaultClient: VaultClient;
  #signingManager?: LocalSigningManager;

  public handleToIdentity: Record<string, Identity> = {};
  #alphabetIndex = 0;
  #adminSigner = '';
  #portfolioIndex = 0;

  public static async create(opts: TestFactoryOpts = {}): Promise<TestFactory> {
    const { handles: signers } = opts;

    const middlewareV2 = {
      link: env.graphqlUrl,
      key: '',
    };

    const polymesh = await Polymesh.connect({
      nodeUrl,
      middlewareV2,
      polkadot: { noInitWarn: true },
    });

    const factory = new TestFactory(polymesh);

    await factory.setupSdk();

    if (signers?.length) {
      await factory.initIdentities(signers);
    }

    return factory;
  }

  public prefixNonce(value: string): string {
    return `${this.nonce}${value}`;
  }

  /**
   * returns unique tickers every time its called. e.g. AAA, AAB, AAC...
   */
  public nextTicker(): string {
    const a = this.#alphabetIndex % alphabet.length;
    const b = Math.floor((this.#alphabetIndex / alphabet.length) % alphabet.length);
    const c = Math.floor(this.#alphabetIndex / alphabet.length ** 2);
    this.#alphabetIndex += 1;
    return this.prefixNonce(`${alphabet[c]}${alphabet[b]}${alphabet[a]}`);
  }

  /**
   * returns unique Portfolio name every time its called. e.g. AAA, AAB, AAC...
   */
  public nextPortfolio(): string {
    const a = this.#portfolioIndex % alphabet.length;
    const b = Math.floor((this.#portfolioIndex / alphabet.length) % alphabet.length);
    const c = Math.floor(this.#portfolioIndex / alphabet.length ** 2);
    this.#portfolioIndex += 1;
    const randomName = this.prefixNonce(`${alphabet[c]}${alphabet[b]}${alphabet[a]}`);
    return `PF-${randomName}`;
  }

  /**
   * Creates a Vault key and DID for each signer.
   * @note This method must be called before using a signer, alternatively signers can be passed to `TestFactory.create`
   */
  public async initIdentities(handles: string[]): Promise<Identity[]> {
    const addresses: string[] = [];
    const signers: string[] = [];

    for (const handle of handles) {
      const vaultKeyName = this.prefixNonce(handle);
      const { address, signer } = await this.vaultClient.createKey(vaultKeyName);
      addresses.push(address);
      signers.push(signer);
    }

    const { results } = await this.fundTestAccounts(addresses);

    results.forEach((identity, index) => {
      const signer = signers[index];
      const handle = handles[index];
      identity.signer = signer;
      this.setCachedSigner(handle, identity);
    });

    return handles.map((handle) => this.getSignerIdentity(handle));
  }

  public async createIdentityForAddresses(addresses: string[]): Promise<ResultSet<Identity>> {
    await this.prefundAddresses(addresses);
    await this.selfRegisterAddresses(addresses);
    await this.fundTestAccountsFromAdmin(addresses);

    const results = await Promise.all(
      addresses.map(async (address) => {
        const { identity } = await this.restClient.get<{ identity: Identity }>(
          `/accounts/${address}`
        );

        if (!identity) {
          throw new Error(`Identity was not found for ${address} after registration`);
        }

        return identity;
      })
    );

    return { results, total: String(results.length) };
  }

  private async prefundAddresses(addresses: string[]): Promise<void> {
    if (!addresses.length) {
      return;
    }

    await this.restClient.post('/developer-testing/prefund-accounts', {
      accounts: addresses.map((address) => ({ address, initialPolyx: 1000 })),
      signer: this.readAdminSigner(),
    });
  }

  private async selfRegisterAddresses(addresses: string[]): Promise<void> {
    for (const address of addresses) {
      const account = await this.polymeshSdk.accountManagement.getAccount({ address });
      const existingIdentity = await account.getIdentity();

      if (!existingIdentity) {
        const registerTx = await this.polymeshSdk.identities.selfRegisterDid({
          signingAccount: address,
        });
        await registerTx.run();

        if (!registerTx.isSuccess) {
          throw new Error(`Failed to self-register DID for ${address}`);
        }
      }
    }
  }

  private async fundTestAccounts(addresses: string[]): Promise<ResultSet<Identity>> {
    const accounts = addresses.map((address) => ({
      address,
      initialPolyx: startingPolyx,
    }));

    const result = (await this.restClient.identities.createTestAccounts(
      accounts,
      this.readAdminSigner()
    )) as ResultSet<Identity> | RestErrorResult;

    if ('statusCode' in result && result.statusCode >= 400) {
      throw new Error(`createTestAccounts failed (${result.statusCode}): ${result.message}`);
    }

    if (!('results' in result) || !result.results?.length) {
      throw new Error(
        `createTestAccounts returned no identities for addresses: ${addresses.join(', ')}`
      );
    }

    return result;
  }

  private async fundTestAccountsFromAdmin(addresses: string[]): Promise<void> {
    const adminSigner = this.readAdminSigner();

    for (const address of addresses) {
      await this.restClient.post('/accounts/transfer', {
        to: address,
        amount: String(startingPolyx),
        options: {
          signer: adminSigner,
          processMode: ProcessMode.Submit,
        },
      });
    }
  }

  public getSignerIdentity(handle: string): Identity {
    const identity = this.handleToIdentity[handle];
    if (!identity) {
      throw new Error(`Identity was not found with ${handle}`);
    }

    return identity;
  }

  public async close(): Promise<void> {
    await Promise.all([this.cleanupIdentities(), this.polymeshSdk.disconnect()]);
  }

  private setCachedSigner(signer: string, identity: Identity) {
    this.handleToIdentity[signer] = identity;
  }

  private readAdminSigner(): string {
    if (this.#adminSigner === '') {
      const workerId = Number(process.env.JEST_WORKER_ID);
      this.#adminSigner = `${workerId}-admin-1`;
    }

    return this.#adminSigner;
  }

  public get signingManager(): LocalSigningManager {
    if (!this.#signingManager) throw new Error('factory signing manager was not set');
    return this.#signingManager;
  }

  private async setupSdk(): Promise<void> {
    const mnemonic = LocalSigningManager.generateAccount();
    this.#signingManager = await LocalSigningManager.create({
      accounts: [{ mnemonic }],
    });

    await this.polymeshSdk.setSigningManager(this.signingManager);

    const addresses = await this.signingManager.getAccounts();

    const [address] = addresses;

    await this.restClient.post('/developer-testing/prefund-accounts', {
      accounts: [{ address, initialPolyx: 1000 }],
      signer: this.readAdminSigner(),
    });

    const registerTx = await this.polymeshSdk.identities.selfRegisterDid({
      signingAccount: address,
    });
    await registerTx.run();

    if (!registerTx.isSuccess) {
      throw new Error(`Failed to self-register SDK signing account ${address}`);
    }

    await this.fundTestAccountsFromAdmin([address]);
  }

  private async cleanupIdentities(): Promise<void> {
    if (env.deleteUsedKeys) {
      await Promise.all(
        Object.keys(this.handleToIdentity).map(async (handle) => {
          const keyName = this.prefixNonce(handle);

          await this.vaultClient.updateKey(keyName, true);
          await this.vaultClient.deleteKey(keyName);
        })
      );
    }
  }

  private constructor(public readonly polymeshSdk: Polymesh) {
    this.nonce = randomNonce(nonceLength);
    this.restClient = new RestClient(env.restApi);
    this.vaultClient = new VaultClient(vaultUrl, vaultTransitPath, vaultToken);
  }
}
