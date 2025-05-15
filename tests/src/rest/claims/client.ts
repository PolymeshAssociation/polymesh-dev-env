import {
  CreateClaimParams,
  registerCustomClaimTypeParams,
} from "~/rest/claims/params";
import { RestClient } from "~/rest/client";
import { PostResult, RestSuccessResult } from "~/rest/interfaces";

export class Claims {
  constructor(private client: RestClient) {}

  public async registerCustomClaimType(
    params: ReturnType<typeof registerCustomClaimTypeParams>
  ): Promise<RestSuccessResult> {
    return this.client.post("/claims/custom-claim-type", params);
  }

  public async getCustomClaimType(
    id: string
  ): Promise<{ id: string; name: string }> {
    return this.client.get(`/claims/custom-claim-types/${id}`);
  }

  public async getCustomClaimTypes(): Promise<PostResult> {
    return this.client.get("/claims/custom-claim-types");
  }

  public async addClaim(params: CreateClaimParams): Promise<PostResult> {
    return this.client.post("/claims/add", params);
  }

  public async removeClaim(params: CreateClaimParams): Promise<PostResult> {
    return this.client.post("/claims/remove", params);
  }

  public async editClaim(params: CreateClaimParams): Promise<PostResult> {
    return this.client.post("/claims/edit", params);
  }
}
