import { AuthorizationType } from '@polymeshassociation/polymesh-sdk/types';

import { RestClient } from '~/rest/client';
import { TxBase } from '~/rest/common';
import {
  CreateTestAccountParams,
  Identity,
  PendingAuthorizations,
  PendingInstructions,
} from '~/rest/identities/interfaces';
import { ResultSet } from '~/rest/interfaces';

export class Identities {
  constructor(private client: RestClient) {}

  public async getPendingInstructions(did: string): Promise<PendingInstructions> {
    return this.client.get(`/identities/${did}/pending-instructions`);
  }

  public async acceptAuthorization(id: string, params: TxBase): Promise<unknown> {
    return this.client.post(`/authorizations/${id}/accept`, { ...params });
  }

  public async getPendingAuthorizations(
    id: string,
    type?: AuthorizationType
  ): Promise<PendingAuthorizations> {
    let queryParams = '';
    if (type) {
      queryParams += `?type=${type}`;
    }
    return this.client.get(`/identities/${id}/pending-authorizations${queryParams}`);
  }

  public async createTestAccounts(
    accounts: CreateTestAccountParams[],
    signer: string
  ): Promise<ResultSet<Identity>> {
    const params = {
      accounts,
      signer,
    };

    const response = await this.client.post<ResultSet<Identity>>(
      '/developer-testing/create-test-accounts',
      params
    );

    return response;
  }

  public async createTestAdmins(accounts: CreateTestAccountParams[]): Promise<ResultSet<Identity>> {
    return this.client.post<ResultSet<Identity>>('/developer-testing/create-test-admins', {
      accounts,
    });
  }

  public async getIssuedClaims(did: string): Promise<ResultSet<unknown>> {
    return this.client.get(`/identities/${did}/issued-claims`);
  }

  public async getAssociatedClaims(did: string): Promise<ResultSet<unknown>> {
    return this.client.get(`/identities/${did}/associated-claims`);
  }

  public async getCddClaims(did: string): Promise<ResultSet<Record<string, unknown>>> {
    return this.client.get(`/identities/${did}/cdd-claims`);
  }

  public async findClaimScopesByDid(did: string): Promise<ResultSet<Record<string, unknown>>> {
    return this.client.get(`/identities/${did}/claim-scopes`);
  }

  public async getHeldAssets(did: string): Promise<ResultSet<unknown>> {
    return this.client.get(`/identities/${did}/held-assets`);
  }

  public async pendingDividendDistributions(
    did: string
  ): Promise<ResultSet<Record<string, unknown>>> {
    return this.client.get(`/identities/${did}/pending-distributions`);
  }
}
