import { RestClient } from '~/rest/client';

export class Accounts {
  constructor(private client: RestClient) {}

  /**
   * @param account - The account address to look up
   * @returns A promise that resolves to the DID associated with the account
   */
  async getIdentity(account: string): Promise<unknown> {
    const response = await this.client.get<{ signerType: string; did: string }>(
      `/accounts/${account}/identity`
    );
    return response.did;
  }

  /**
   * @returns A promise that resolves to the treasury balance
   */
  async getTreasuryBalance(): Promise<{ balance: string }> {
    return this.client.get('/accounts/treasury/balance');
  }

  /**
   * @param account - The account address whose balance is to be fetched
   * @returns A promise that resolves to the free/locked/total POLYX balance, along with the
   *   `reserved` and `frozen` portions of `locked` (chain v8+)
   */
  async getBalance(account: string): Promise<{
    free: string;
    locked: string;
    total: string;
    reserved: string;
    frozen: string;
  }> {
    return this.client.get(`/accounts/${account}/balance`);
  }
}
