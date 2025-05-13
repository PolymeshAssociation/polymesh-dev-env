import { RestClient } from "~/rest/client";
import { TxBase } from "~/rest/common";
import {
  complianceRequirementParams,
  complianceRequirementsParams,
} from "~/rest/compliance/params";
import { PostResult } from "~/rest/interfaces";

export class Compliance {
  constructor(private client: RestClient) {}

  public async getComplianceRequirements(
    ticker: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ requirements: any[]; defaultTrustedClaimIssuers: any[] }> {
    return this.client.get(`/assets/${ticker}/compliance-requirements`);
  }

  public async setRequirements(
    ticker: string,
    params: ReturnType<typeof complianceRequirementsParams>
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${ticker}/compliance-requirements/set`,
      params
    );
  }

  public async pauseRequirements(
    ticker: string,
    txBase: TxBase
  ): Promise<unknown> {
    return this.client.post(`/assets/${ticker}/compliance-requirements/pause`, {
      ...txBase,
    });
  }

  public async unpauseRequirements(
    ticker: string,
    txBase: TxBase
  ): Promise<unknown> {
    return this.client.post(
      `/assets/${ticker}/compliance-requirements/unpause`,
      { ...txBase }
    );
  }

  public async deleteRequirement(
    id: string,
    ticker: string,
    params: TxBase
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${ticker}/compliance-requirements/${id}/delete`,
      {
        ...params,
      }
    );
  }

  public async deleteRequirements(
    ticker: string,
    params: TxBase
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${ticker}/compliance-requirements/delete`,
      { ...params }
    );
  }

  public async addRequirement(
    ticker: string,
    params: ReturnType<typeof complianceRequirementParams>
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${ticker}/compliance-requirements/add`,
      params
    );
  }

  public async modifyComplianceRequirement(
    id: string,
    ticker: string,
    params: ReturnType<typeof complianceRequirementParams>
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${ticker}/compliance-requirements/${id}/modify`,
      params
    );
  }

  public async areRequirementsPaused(
    ticker: string
  ): Promise<{ arePaused: boolean }> {
    return this.client.get(`/assets/${ticker}/compliance-requirements/status`);
  }
}
