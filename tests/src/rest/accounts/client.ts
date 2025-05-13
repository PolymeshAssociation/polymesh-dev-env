import {
  assetMediatorsParams,
  createAssetParams,
  createMetadataParams,
  issueAssetParams,
  MetadataType,
  redeemTokenParams,
  setAssetDocumentParams,
  setMetadataParams,
  transferAssetOwnershipParams,
} from "~/rest/assets/params";
import { RestClient } from "~/rest/client";
import { TxBase } from "~/rest/common";
import { PostResult, RestSuccessResult } from "~/rest/interfaces";

export class Accounts {
  constructor(private client: RestClient) {}

  /**
   * @param account - The account address to look up
   * @returns A promise that resolves to the DID associated with the account
   */
  async getIdentity(account: string): Promise<unknown> {
    const response = await this.client.get<{ signerType: string; did: string }>(
      `/accounts/${account}/identity`
    );
    return response.did;
  }
}
