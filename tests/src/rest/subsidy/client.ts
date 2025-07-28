import { RestClient } from '~/rest/client';
import { PostResult } from '~/rest/interfaces';
import {
  createSubsidyParams,
  quitSubsidyParams,
  setSubsidyAllowanceParams,
} from '~/rest/subsidy/params';

export class Subsidy {
  constructor(private client: RestClient) {}

  public async createSubsidy(
    params: ReturnType<typeof createSubsidyParams>
  ): Promise<Record<string, unknown>> {
    return this.client.post('/accounts/subsidy/create', params);
  }

  public async getSubsidy(subsidizer: string, beneficiary: string): Promise<unknown> {
    return this.client.get(`/accounts/subsidy/${subsidizer}/${beneficiary}`);
  }

  public async setSubsidyAllowance(
    params: ReturnType<typeof setSubsidyAllowanceParams>
  ): Promise<PostResult> {
    return this.client.post('/accounts/subsidy/allowance/set', params);
  }

  public async quitSubsidy(params: ReturnType<typeof quitSubsidyParams>): Promise<PostResult> {
    return this.client.post('/accounts/subsidy/quit', params);
  }
}
