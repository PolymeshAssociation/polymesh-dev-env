import { RestClient } from '~/rest/client';

export class Network {
  constructor(private client: RestClient) {}

  public async getLatestBlock(): Promise<{ id: string }> {
    return this.client.get('/network/latest-block');
  }

  public async getMiddlewareMetadata(): Promise<unknown> {
    return this.client.get('/network/middleware-metadata');
  }

  public async getProtocolFees(queryParams?: {
    tags?: string[];
    blockHash?: string;
  }): Promise<Array<{ tag: string; fee: string }>> {
    const params = new URLSearchParams();

    if (queryParams?.tags) {
      queryParams.tags.forEach((tag) => params.append('tags', tag));
    }

    if (queryParams?.blockHash) {
      params.append('blockHash', queryParams.blockHash);
    }

    const queryString = params.toString();
    const path = queryString ? `/network/protocol-fees?${queryString}` : '/network/protocol-fees';

    return this.client.get(path);
  }
}
