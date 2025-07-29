import { RestClient } from '~/rest/client';
import { PostResult, RestSuccessResult } from '~/rest/interfaces';
import {
  approveProposalParams,
  createMultiSigParams,
  modifyMultiSigParams,
  rejectProposalParams,
  removeAdminParams,
  removePayerParams,
  setAdminParams,
} from '~/rest/multiSigs/params';

import {
  MultiSigAdmin,
  MultiSigPayer,
  MultiSigProposalModel,
  PaginatedProposalsModel,
} from './interfaces';

export class MultiSigs {
  constructor(private client: RestClient) {}

  public async createMultiSig(
    params: ReturnType<typeof createMultiSigParams>
  ): Promise<PostResult> {
    return this.client.post('/multi-sigs/create', params);
  }

  public async createAndGetAddress(
    params: ReturnType<typeof createMultiSigParams>
  ): Promise<string> {
    const result = (await this.createMultiSig(params)) as RestSuccessResult;
    return result.multiSigAddress as string;
  }

  public async modifyMultiSig(
    address: string,
    params: ReturnType<typeof modifyMultiSigParams>
  ): Promise<PostResult> {
    return this.client.post(`/multi-sigs/${address}/modify`, params);
  }

  public async getProposal(
    address: string,
    proposalId: string
  ): Promise<MultiSigProposalModel> {
    return this.client.get(`/multi-sigs/${address}/proposals/${proposalId}`);
  }

  public async approveProposal(
    address: string,
    proposalId: string,
    params: ReturnType<typeof approveProposalParams>
  ): Promise<PostResult> {
    return this.client.post(`/multi-sigs/${address}/proposals/${proposalId}/approve`, params);
  }

  public async rejectProposal(
    address: string,
    proposalId: string,
    params: ReturnType<typeof rejectProposalParams>
  ): Promise<PostResult> {
    return this.client.post(`/multi-sigs/${address}/proposals/${proposalId}/reject`, params);
  }

  public async getAdmin(address: string): Promise<MultiSigAdmin> {
    return this.client.get(`/multi-sigs/${address}/admin`);
  }

  public async setAdmin(
    address: string,
    params: ReturnType<typeof setAdminParams>
  ): Promise<PostResult> {
    return this.client.post(`/multi-sigs/${address}/admin/set`, params);
  }

  public async removeAdmin(
    address: string,
    params: ReturnType<typeof removeAdminParams>
  ): Promise<PostResult> {
    return this.client.post(`/multi-sigs/${address}/admin/remove`, params);
  }

  public async getPayer(address: string): Promise<MultiSigPayer> {
    return this.client.get(`/multi-sigs/${address}/payer`);
  }

  public async removePayer(
    address: string,
    params: ReturnType<typeof removePayerParams>
  ): Promise<PostResult> {
    return this.client.post(`/multi-sigs/${address}/payer/remove`, params);
  }

  public async getActiveProposals(
    address: string,
    size?: string,
    start?: string
  ): Promise<PaginatedProposalsModel> {
    const queryParams = new URLSearchParams();
    if (size) queryParams.append('size', size);
    if (start) queryParams.append('start', start);
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.client.get(`/multi-sigs/${address}/active-proposals${query}`);
  }

  public async getHistoricalProposals(
    address: string,
    size?: string,
    start?: string
  ): Promise<PaginatedProposalsModel> {
    const queryParams = new URLSearchParams();
    if (size) queryParams.append('size', size);
    if (start) queryParams.append('start', start);
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.client.get(`/multi-sigs/${address}/historical-proposals${query}`);
  }
}