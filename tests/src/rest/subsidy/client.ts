import { RestClient } from '~/rest/client';
import { PostResult } from '~/rest/interfaces';
import {
  acceptSubsidyParams,
  createSubsidyParams,
  quitSubsidyParams,
  setSubsidyAllowanceParams,
} from '~/rest/subsidy/params';

export class Subsidy {
  constructor(private client: RestClient) {}

  public async approveSubsidy(params: ReturnType<typeof createSubsidyParams>): Promise<PostResult> {
    return this.client.post('/accounts/subsidy/approve', params);
  }

  public async acceptSubsidy(params: ReturnType<typeof acceptSubsidyParams>): Promise<PostResult> {
    return this.client.post('/accounts/subsidy/accept', params);
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
