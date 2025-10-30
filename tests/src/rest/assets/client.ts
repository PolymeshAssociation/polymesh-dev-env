import { AssetStat } from '@polymeshassociation/polymesh-sdk/types';

import {
  abdicateAgentParams,
  assetMediatorsParams,
  assignAgentToGroupParams,
  checkAgentPermissionsParams,
  controllerTransferParams,
  createAssetParams,
  createMetadataParams,
  createPermissionGroupParams,
  inviteAgentToGroupParams,
  issueAssetParams,
  MetadataType,
  modifyPermissionGroupParams,
  redeemTokenParams,
  removeAgentFromGroupParams,
  setAssetDocumentParams,
  setMetadataParams,
  setTransferRestrictionsParams,
  setTransferRestrictionStatsParams,
  transferAssetOwnershipParams,
} from '~/rest/assets/params';
import { RestClient } from '~/rest/client';
import { TxBase } from '~/rest/common';
import { PostResult, RestSuccessResult, ResultSet } from '~/rest/interfaces';

export class Assets {
  constructor(private client: RestClient) {}

  public async createAndGetAssetId(params: ReturnType<typeof createAssetParams>): Promise<string> {
    const result = (await this.createAsset(params)) as RestSuccessResult;

    return result.asset as string;
  }

  public async createAsset(params: ReturnType<typeof createAssetParams>): Promise<PostResult> {
    return this.client.post('/assets/create', params);
  }

  public async getAsset(asset: string): Promise<unknown> {
    return this.client.get(`/assets/${asset}`);
  }

  public async getGlobalMetadata(): Promise<unknown> {
    return this.client.get('/assets/global-metadata');
  }

  public async getMetadata(asset: string): Promise<unknown> {
    return this.client.get(`/assets/${asset}/metadata`);
  }

  public async getMetadataById(asset: string, type: MetadataType, id: string): Promise<unknown> {
    return this.client.get(`assets/${asset}/metadata/${type}/${id}`);
  }

  public async createMetadata(
    asset: string,
    params: ReturnType<typeof createMetadataParams>
  ): Promise<PostResult> {
    return this.client.post(`/assets/${asset}/metadata/create`, params);
  }

  public async setMetadataValue(
    asset: string,
    type: MetadataType,
    id: string,
    params: ReturnType<typeof setMetadataParams>
  ): Promise<PostResult> {
    return this.client.post(`/assets/${asset}/metadata/${type}/${id}/set`, params);
  }

  public async getDocuments(asset: string): Promise<unknown> {
    return this.client.get(`assets/${asset}/documents`);
  }

  public async getAssetMediators(asset: string): Promise<unknown> {
    return this.client.get(`assets/${asset}/required-mediators`);
  }

  public async setDocuments(
    asset: string,
    params: ReturnType<typeof setAssetDocumentParams>
  ): Promise<PostResult> {
    return this.client.post(`assets/${asset}/documents/set`, params);
  }

  public async redeem(
    asset: string,
    params: ReturnType<typeof redeemTokenParams>
  ): Promise<PostResult> {
    return this.client.post(`assets/${asset}/redeem`, params);
  }

  public async addAssetMediators(
    asset: string,
    params: ReturnType<typeof assetMediatorsParams>
  ): Promise<PostResult> {
    return this.client.post(`assets/${asset}/add-required-mediators`, params);
  }

  public async removeAssetMediators(
    asset: string,
    params: ReturnType<typeof assetMediatorsParams>
  ): Promise<PostResult> {
    return this.client.post(`assets/${asset}/remove-required-mediators`, params);
  }

  public async transferAssetOwnership(
    asset: string,
    params: ReturnType<typeof transferAssetOwnershipParams>
  ): Promise<Record<string, unknown>> {
    return this.client.post(`assets/${asset}/transfer-ownership`, params);
  }

  public async preApprove(asset: string, params: TxBase): Promise<PostResult> {
    return this.client.post(`assets/${asset}/pre-approve`, { ...params });
  }

  public async removePreApproval(asset: string, params: TxBase): Promise<PostResult> {
    return this.client.post(`assets/${asset}/remove-pre-approval`, {
      ...params,
    });
  }

  public async getIsPreApproved(asset: string, did: string): Promise<unknown> {
    return this.client.get(`identities/${did}/is-pre-approved?asset=${asset}`);
  }

  public async getPreApprovals(did: string): Promise<unknown> {
    return this.client.get(`identities/${did}/pre-approved-assets`);
  }

  public async issue(
    asset: string,
    params: ReturnType<typeof issueAssetParams>
  ): Promise<PostResult> {
    return this.client.post(`assets/${asset}/issue`, params);
  }

  public async freeze(asset: string, params: TxBase): Promise<PostResult> {
    return this.client.post(`assets/${asset}/freeze`, { ...params });
  }

  public async unfreeze(asset: string, params: TxBase): Promise<PostResult> {
    return this.client.post(`assets/${asset}/unfreeze`, { ...params });
  }

  public async controllerTransfer(
    asset: string,
    params: ReturnType<typeof controllerTransferParams>
  ): Promise<PostResult> {
    return this.client.post(`assets/${asset}/controller-transfer`, params);
  }

  public async getAssetHolders(asset: string): Promise<ResultSet<Record<string, unknown>>> {
    return this.client.get(`assets/${asset}/holders`);
  }

  public async getTransferRestrictions(asset: string): Promise<unknown> {
    return this.client.get(`assets/${asset}/transfer-restrictions`);
  }

  public async getTransferRestrictionStats(asset: string): Promise<AssetStat[]> {
    return this.client.get(`assets/${asset}/transfer-restrictions/stats`);
  }

  public async setTransferRestrictionStats(
    asset: string,
    params: ReturnType<typeof setTransferRestrictionStatsParams>
  ): Promise<PostResult> {
    return this.client.post(`assets/${asset}/transfer-restrictions/stats/set`, params);
  }

  public async setTransferRestrictions(
    asset: string,
    params: ReturnType<typeof setTransferRestrictionsParams>
  ): Promise<PostResult> {
    return this.client.post(`assets/${asset}/transfer-restrictions/set`, params);
  }

  public async addTransferRestrictions(
    asset: string,
    params: ReturnType<typeof setTransferRestrictionsParams>
  ): Promise<PostResult> {
    return this.client.post(`assets/${asset}/transfer-restrictions/add`, params);
  }

  public async removeTransferRestrictions(
    asset: string,
    params: TxBase['options']
  ): Promise<PostResult> {
    return this.client.post(`assets/${asset}/transfer-restrictions/remove`, {
      ...params,
    });
  }

  public async getVenueFilteringDetails(asset: string): Promise<{
    isEnabled: boolean;
    allowedVenues: string[];
    disallowedVenues: string[];
  }> {
    return this.client.get(`/assets/${asset}/venue-filtering`);
  }

  public async enableVenueFiltering(asset: string, params: TxBase): Promise<PostResult> {
    return this.client.post(
      `/assets/${asset}/venue-filtering/enable`,
      params as unknown as Record<string, unknown>
    );
  }

  public async disableVenueFiltering(asset: string, params: TxBase): Promise<PostResult> {
    return this.client.post(
      `/assets/${asset}/venue-filtering/disable`,
      params as unknown as Record<string, unknown>
    );
  }

  public async allowVenues(
    asset: string,
    params: { venues: number[] } & TxBase
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${asset}/venue-filtering/allow`,
      params as unknown as Record<string, unknown>
    );
  }

  public async disallowVenues(
    asset: string,
    params: { venues: number[] } & TxBase
  ): Promise<PostResult> {
    return this.client.post(
      `/assets/${asset}/venue-filtering/disallow`,
      params as unknown as Record<string, unknown>
    );
  }

  public async abdicateAgent(
    asset: string,
    params: ReturnType<typeof abdicateAgentParams>
  ): Promise<PostResult> {
    return this.client.post(`/assets/${asset}/permission-groups/abdicate`, params);
  }

  public async assignAgentToGroup(
    asset: string,
    params: ReturnType<typeof assignAgentToGroupParams>
  ): Promise<PostResult> {
    return this.client.post(`/assets/${asset}/permission-groups/assign-agent`, params);
  }

  public async createPermissionGroup(
    asset: string,
    params: ReturnType<typeof createPermissionGroupParams>
  ): Promise<PostResult & { id: string }> {
    return this.client.post(`/assets/${asset}/permission-groups/create`, params);
  }

  public async getPermissionGroups(asset: string): Promise<ResultSet<string>> {
    return this.client.get(`/assets/${asset}/permission-groups`);
  }

  public async getPermissionGroup(
    asset: string,
    groupId: string
  ): Promise<{ id: string; permissions: Record<string, unknown> }> {
    return this.client.get(`/assets/${asset}/permission-groups/${groupId}`);
  }

  public async setPermissionGroup(
    asset: string,
    groupId: string,
    params: ReturnType<typeof modifyPermissionGroupParams>
  ): Promise<PostResult> {
    return this.client.post(`/assets/${asset}/permission-groups/${groupId}/set`, params);
  }

  public async inviteAgentToGroup(
    asset: string,
    params: ReturnType<typeof inviteAgentToGroupParams>
  ): Promise<PostResult & { authorizationRequest: { id: string } }> {
    return this.client.post(`/assets/${asset}/permission-groups/invite-agent`, params);
  }

  public async removeAgentFromGroup(
    asset: string,
    params: ReturnType<typeof removeAgentFromGroupParams>
  ): Promise<PostResult> {
    return this.client.post(`/assets/${asset}/permission-groups/remove-agent`, params);
  }

  public async checkPermissions(
    asset: string,
    params: ReturnType<typeof checkAgentPermissionsParams>
  ): Promise<{ result: boolean; missingPermissions?: string[] | null; message?: string }> {
    const searchParams = new URLSearchParams();
    searchParams.set('target', params.target as string);
    const maybeTransactions = (params as { transactions?: string[] }).transactions;
    if (maybeTransactions) {
      maybeTransactions.forEach((tx) => searchParams.append('transactions', tx));
    }

    return this.client.get(
      `/assets/${asset}/permission-groups/check-permissions?${searchParams.toString()}`
    );
  }
}
