export interface Identity {
  /**
   * The value used to refer to the signer in the REST API
   */
  signer: string;
  did: string;
  primaryAccount: {
    account: {
      address: string;
    };
  };
}

export interface PendingInstructions {
  results: string[];
}

export interface Authorization {
  id: string;
  expiry: Date | null;
  data: Record<string, unknown>;
  target: string;
  issuer: Record<string, unknown>;
}

export interface PendingAuthorizations {
  sent: Authorization[];
  received: Authorization[];
}

export interface CreateTestAccountParams {
  address: string;
  initialPolyx: number;
}
