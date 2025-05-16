import { RestClient } from "~/rest/client";

export class Network {
  constructor(private client: RestClient) {}

  public async getLatestBlock(): Promise<{ id: string }> {
    return this.client.get("/network/latest-block");
  }

  public async getMiddlewareMetadata(): Promise<unknown> {
    return this.client.get("/network/middleware-metadata");
  }
}
