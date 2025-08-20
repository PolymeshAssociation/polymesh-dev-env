import {
  assetMediatorsParams,
  controllerTransferParams,
  createAssetParams,
  createMetadataParams,
  issueAssetParams,
  MetadataType,
  redeemTokenParams,
  setAssetDocumentParams,
  setMetadataParams,
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
}
