import { RestClient } from '~/rest/client';
import { PostResult, RestSuccessResult, ResultSet } from '~/rest/interfaces';
import {
  claimDividendDistributionParams,
  createDividendDistributionParams,
  payDividendDistributionParams,
  reclaimDividendDistributionParams,
} from './params';

export class CorporateActions {
  constructor(private client: RestClient) {}

  // NOTE: Only endpoints verified against docs should live here

  // GET /assets/{asset}/corporate-actions/dividend-distributions
  public async getDividendDistributions(asset: string): Promise<ResultSet<unknown>> {
    return this.client.get(`/assets/${asset}/corporate-actions/dividend-distributions`);
  }

  // GET /assets/{asset}/corporate-actions/dividend-distributions/{id}
  public async getDividendDistribution(
    asset: string,
    id: string
  ): Promise<Record<string, unknown>> {
    return this.client.get(`/assets/${asset}/corporate-actions/dividend-distributions/${id}`);
  }

  // POST /assets/{asset}/corporate-actions/dividend-distributions/create
  public async configureDividendDistribution(
    asset: string,
    params: ReturnType<typeof createDividendDistributionParams>
  ): Promise<RestSuccessResult & { dividendDistribution: Record<string, unknown> }> {
    return this.client.post(
      `/assets/${asset}/corporate-actions/dividend-distributions/create`,
      params
    );
  }

  // POST /assets/{asset}/corporate-actions/dividend-distributions/{id}/pay
  public async payDividendDistribution(
    asset: string,
    id: string,
    params: ReturnType<typeof payDividendDistributionParams>
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${asset}/corporate-actions/dividend-distributions/${id}/payments/pay`,
      params
    );
  }

  // POST /assets/{asset}/corporate-actions/dividend-distributions/{id}/claim
  public async claimDividendDistribution(
    asset: string,
    id: string,
    params: ReturnType<typeof claimDividendDistributionParams>
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${asset}/corporate-actions/dividend-distributions/${id}/payments/claim`,
      params
    );
  }

  // POST /assets/{asset}/corporate-actions/dividend-distributions/{id}/reclaim-funds
  public async reclaimDividendDistributionFunds(
    asset: string,
    id: string,
    params: ReturnType<typeof reclaimDividendDistributionParams>
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${asset}/corporate-actions/dividend-distributions/${id}/reclaim-funds`,
      params
    );
  }

  public async modifyDistributionCheckpoint(
    asset: string,
    id: string,
    params: ReturnType<typeof reclaimDividendDistributionParams>
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${asset}/corporate-actions/dividend-distributions/${id}/modify-checkpoint`,
      params
    );
  }

  public async paymentHistory(
    asset: string,
    id: string
  ): Promise<ResultSet<Record<string, unknown>>> {
    return this.client.get(
      `/assets/${asset}/corporate-actions/dividend-distributions/${id}/payment-history`
    );
  }
}
