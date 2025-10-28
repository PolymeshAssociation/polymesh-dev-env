import { RestClient } from '~/rest/client';
import { TxBase } from '~/rest/common';
import { PostResult, ResultSet } from '~/rest/interfaces';
import {
  fungibleInstructionParams,
  nftInstructionParams,
  venueParams,
} from '~/rest/settlements/params';

export class Settlements {
  constructor(private client: RestClient) {}

  public async createVenue(params: ReturnType<typeof venueParams>): Promise<unknown> {
    return this.client.post('/venues/create', params);
  }

  public async createInstruction(
    venueId: string,
    params: ReturnType<typeof fungibleInstructionParams> | ReturnType<typeof nftInstructionParams>
  ): Promise<PostResult> {
    return this.client.post(`/venues/${venueId}/instructions/create`, params);
  }

  public async createDirectInstruction(
    params: ReturnType<typeof fungibleInstructionParams> | ReturnType<typeof nftInstructionParams>
  ): Promise<PostResult> {
    return this.client.post('/instructions/create', params);
  }

  public async affirmInstruction(instructionId: string, txBase: TxBase): Promise<PostResult> {
    return this.client.post(`/instructions/${instructionId}/affirm`, {
      ...txBase,
    });
  }

  public async affirmInstructionAsMediator(
    instructionId: string,
    expiry: Date | undefined,
    txBase: TxBase
  ): Promise<PostResult> {
    return this.client.post(`/instructions/${instructionId}/affirm-as-mediator`, {
      expiry,
      ...txBase,
    });
  }

  public async withdrawAsMediator(instructionId: string, txBase: TxBase): Promise<PostResult> {
    return this.client.post(`/instructions/${instructionId}/withdraw-as-mediator`, {
      ...txBase,
    });
  }

  public async rejectAsMediator(instructionId: string, txBase: TxBase): Promise<PostResult> {
    return this.client.post(`/instructions/${instructionId}/reject-as-mediator`, {
      ...txBase,
    });
  }

  public async getInstruction(instructionId: string): Promise<unknown> {
    return this.client.get(`/instructions/${instructionId}`);
  }

  public async withdrawAffirmation(instructionId: string, txBase: TxBase): Promise<PostResult> {
    return this.client.post(`/instructions/${instructionId}/withdraw`, {
      ...txBase,
    });
  }

  public async rejectInstruction(instructionId: string, txBase: TxBase): Promise<PostResult> {
    return this.client.post(`/instructions/${instructionId}/reject`, {
      ...txBase,
    });
  }

  public async getAffirmations(
    instructionId: string
  ): Promise<ResultSet<{ identity: string; status: string }>> {
    return this.client.get(`/instructions/${instructionId}/affirmations`);
  }

  public async getVenue(venueId: string): Promise<unknown> {
    return this.client.get(`/venues/${venueId}`);
  }

  public async updateVenue(
    venueId: string,
    params: { description?: string; type?: string },
    txBase: TxBase
  ): Promise<PostResult> {
    return this.client.post(`/venues/${venueId}/modify`, {
      ...txBase,
      ...params,
    });
  }

  public async executeInstructionManually(
    instructionId: string,
    txBase: TxBase
  ): Promise<PostResult> {
    return this.client.post(`/instructions/${instructionId}/execute-manually`, {
      ...txBase,
    });
  }

  public async validateLeg({
    asset,
    toPortfolio,
    toDid,
    fromPortfolio,
    fromDid,
    amount,
  }: {
    asset: string;
    toPortfolio: string;
    toDid: string;
    fromPortfolio: string;
    fromDid: string;
    amount: string;
  }): Promise<unknown> {
    return this.client.get(
      `/leg-validations?asset=${asset}&toPortfolio=${toPortfolio}&toDid=${toDid}&fromPortfolio=${fromPortfolio}&fromDid=${fromDid}&amount=${amount}`
    );
  }

  public async getPendingInstructions(did: string): Promise<ResultSet<{ id: string }>> {
    return this.client.get(`/identities/${did}/pending-instructions`);
  }
}
