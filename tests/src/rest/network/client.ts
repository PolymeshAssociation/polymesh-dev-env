import { RestClient } from "~/rest/client";

export class Network {
  constructor(private client: RestClient) {}

  public async getMiddlewareMetadata(): Promise<unknown> {
    return this.client.get("/network/middleware-metadata");
  }
}
