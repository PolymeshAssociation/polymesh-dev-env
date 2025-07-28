import { RestClient } from '~/rest/client';
import { TxBase } from '~/rest/common';
import { PostResult, ResultSet } from '~/rest/interfaces';

import {
  createCheckpointParams,
  createScheduleParams,
  modifyDistributionCheckpointParams,
} from './params';

export class Checkpoints {
  constructor(private client: RestClient) {}

  // GET /assets/{asset}/checkpoints
  public async getCheckpoints(asset: string): Promise<ResultSet<unknown>> {
    return this.client.get(`/assets/${asset}/checkpoints`);
  }

  // POST /assets/{asset}/checkpoints
  public async createCheckpoint(
    asset: string,
    params: ReturnType<typeof createCheckpointParams>
  ): Promise<PostResult> {
    return this.client.post(`/assets/${asset}/checkpoints`, params);
  }

  // GET /assets/{asset}/checkpoints/{id}
  public async getCheckpoint(asset: string, id: string): Promise<unknown> {
    return this.client.get(`/assets/${asset}/checkpoints/${id}`);
  }

  // GET /assets/{asset}/checkpoints/schedules
  public async getSchedules(asset: string): Promise<ResultSet<unknown>> {
    return this.client.get(`/assets/${asset}/checkpoints/schedules`);
  }

  // GET /assets/{asset}/checkpoints/schedules/{id}
  public async getSchedule(asset: string, id: string): Promise<unknown> {
    return this.client.get(`/assets/${asset}/checkpoints/schedules/${id}`);
  }

  // POST /assets/{asset}/checkpoints/schedules/create
  public async createSchedule(
    asset: string,
    params: ReturnType<typeof createScheduleParams>
  ): Promise<PostResult> {
    return this.client.post(`/assets/${asset}/checkpoints/schedules/create`, params);
  }

  // GET /assets/{asset}/checkpoints/{id}/balances
  public async getCheckpointBalances(
    asset: string,
    id: string
  ): Promise<ResultSet<{ identity: string; balance: string }>> {
    return this.client.get(`/assets/${asset}/checkpoints/${id}/balances`);
  }

  // GET /assets/{asset}/checkpoints/{id}/balances/{did}
  public async getCheckpointBalanceForDid(
    asset: string,
    id: string,
    did: string
  ): Promise<unknown> {
    return this.client.get(`/assets/${asset}/checkpoints/${id}/balances/${did}`);
  }

  // POST /assets/{asset}/checkpoints/schedules/{id}/delete
  public async deleteSchedule(asset: string, id: string, params: TxBase): Promise<PostResult> {
    return this.client.post(
      `/assets/${asset}/checkpoints/schedules/${id}/delete?signer=${params.options.signer}&processMode=${params.options.processMode}`,
      {}
    );
  }

  // GET /assets/{asset}/checkpoints/schedules/{id}/checkpoints
  public async getScheduleCheckpoints(asset: string, id: string): Promise<unknown> {
    return this.client.get(`/assets/${asset}/checkpoints/schedules/${id}/checkpoints`);
  }

  // GET /assets/{asset}/checkpoints/complexity
  public async getComplexity(asset: string): Promise<unknown> {
    return this.client.get(`/assets/${asset}/checkpoints/complexity`);
  }

  // GET /assets/{asset}/checkpoints/schedules/{id}/complexity
  public async getScheduleComplexity(asset: string, id: string): Promise<unknown> {
    return this.client.get(`/assets/${asset}/checkpoints/schedules/${id}/complexity`);
  }

  // POST /assets/{asset}/corporate-actions/dividend-distributions/{id}/modify-checkpoint
  public async modifyDistributionCheckpoint(
    asset: string,
    id: string,
    params: ReturnType<typeof modifyDistributionCheckpointParams>
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${asset}/corporate-actions/dividend-distributions/${id}/modify-checkpoint`,
      params
    );
  }
}
