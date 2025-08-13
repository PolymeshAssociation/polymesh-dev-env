import { RestClient } from '~/rest/client';
import { TxBase } from '~/rest/common';
import { PostResult, ResultSet } from '~/rest/interfaces';
import { CreatedPortfolioResult, PortfolioInfoResult } from '~/rest/portfolios/interfaces';
import { moveAssetParams, portfolioParams, setCustodianParams } from '~/rest/portfolios/params';

export class Portfolios {
  constructor(private client: RestClient) {}

  public async getPortfolios(did: string): Promise<ResultSet<Record<string, unknown>>> {
    return this.client.get(`/identities/${did}/portfolios`);
  }

  public async moveAssets(
    did: string,
    params: ReturnType<typeof moveAssetParams>
  ): Promise<PostResult> {
    return this.client.post(`/identities/${did}/portfolios/move-assets`, params);
  }

  public async createPortfolio(
    params: ReturnType<typeof portfolioParams>
  ): Promise<CreatedPortfolioResult> {
    return this.client.post('portfolios/create', params);
  }

  public async deletePortfolio(
    did: string,
    portfolioId: string,
    txBase: TxBase
  ): Promise<CreatedPortfolioResult> {
    return this.client.postDelete(`/identities/${did}/portfolios/${portfolioId}/delete`, txBase);
  }

  public async modifyPortfolioName(
    did: string,
    portfolioId: string,
    params: ReturnType<typeof portfolioParams>
  ): Promise<PostResult> {
    return this.client.post(`/identities/${did}/portfolios/${portfolioId}/modify-name`, params);
  }

  public async getCustodiedPortfolios(did: string): Promise<ResultSet<Record<string, unknown>>> {
    return this.client.get(`/identities/${did}/custodied-portfolios`);
  }

  public async getPortfolio(did: string, portfolioId: string): Promise<PortfolioInfoResult> {
    return this.client.get(`/identities/${did}/portfolios/${portfolioId}`);
  }

  public async setCustodian(
    did: string,
    portfolioId: string,
    params: ReturnType<typeof setCustodianParams>
  ): Promise<Record<string, unknown>> {
    return this.client.post(`/identities/${did}/portfolios/${portfolioId}/custodian`, params);
  }

  public async getTransactionHistory(
    did: string,
    portfolioId: string
  ): Promise<ResultSet<Record<string, unknown>>> {
    return this.client.get(`/identities/${did}/portfolios/${portfolioId}/transactions`);
  }

  public async quitCustody(did: string, portfolioId: string, txBase: TxBase): Promise<PostResult> {
    return this.client.post(`/identities/${did}/portfolios/${portfolioId}/quit-custody`, {
      ...txBase,
    });
  }

  public async createdAt(did: string, portfolioId: string): Promise<Record<string, unknown>> {
    return this.client.get(`/identities/${did}/portfolios/${portfolioId}/created-at`);
  }
}
