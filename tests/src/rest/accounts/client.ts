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
}
