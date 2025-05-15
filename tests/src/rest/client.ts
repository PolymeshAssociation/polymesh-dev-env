import fetch from "cross-fetch";

import { Assets } from "~/rest/assets";
import { Claims } from "~/rest/claims/client";
import { TxBase } from "~/rest/common";
import { Compliance } from "~/rest/compliance";
import { Identities } from "~/rest/identities";
import { Network } from "~/rest/network";
import { Nfts } from "~/rest/nfts";
import { Portfolios } from "~/rest/portfolios";
import { Settlements } from "~/rest/settlements";
import { Subsidy } from "~/rest/subsidy";
import { TickerReservations } from "~/rest/tickerReservations";
import { Accounts } from "~/rest/accounts";

export class RestClient {
  public accounts: Accounts;
  public assets: Assets;
  public nfts: Nfts;
  public compliance: Compliance;
  public identities: Identities;
  public settlements: Settlements;
  public subsidy: Subsidy;
  public tickerReservations: TickerReservations;
  public portfolios: Portfolios;
  public claims: Claims;
  public network: Network;

  constructor(public baseUrl: string) {
    this.accounts = new Accounts(this);
    this.assets = new Assets(this);
    this.nfts = new Nfts(this);
    this.compliance = new Compliance(this);
    this.identities = new Identities(this);
    this.settlements = new Settlements(this);
    this.subsidy = new Subsidy(this);
    this.tickerReservations = new TickerReservations(this);
    this.portfolios = new Portfolios(this);
    this.claims = new Claims(this);
    this.network = new Network(this);
  }

  public async get<T = unknown>(path: string): Promise<T> {
    const url = new URL(path, this.baseUrl).href;

    const method = "GET";

    return this.fetch(url, method) as Promise<T>;
  }

  public async post<T = unknown>(
    path: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const url = new URL(path, this.baseUrl).href;
    const method = "POST";
    return this.fetch(url, method, body) as Promise<T>;
  }

  public async postDelete<T = unknown>(
    path: string,
    txBase: TxBase
  ): Promise<T> {
    const url = new URL(
      `${path}?signer=${txBase.options.signer}&processMode=${txBase.options.processMode}`,
      this.baseUrl
    ).href;
    const method = "POST";
    return this.fetch(url, method) as Promise<T>;
  }

  private async fetch(
    url: string,
    method: string,
    reqBody?: Record<string, unknown>
  ): Promise<unknown> {
    const body = JSON.stringify(reqBody ?? undefined);

    const response = await fetch(url, {
      headers: [["Content-Type", "application/json"]],
      method,
      body,
    });

    return response.json();
  }

  public async pingForTransaction(
    txHash: string,
    times: number
  ): Promise<unknown> {
    const url = new URL(`/transactions/${txHash}/details`, this.baseUrl).href;

    // ping specified times to check if given transaction is in SQ (wait until 200 response)
    let i = 0;
    let success = false;

    while (i < times && !success) {
      const response = await fetch(url, { method: "GET" });
      if (response.status === 200) {
        success = true;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));

      i++;
    }

    return success;
  }
}
