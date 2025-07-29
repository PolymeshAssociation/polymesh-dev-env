export interface SignerModel {
  account: string;
  approvalAmount: string;
  rejectionAmount: string;
}

export interface MultiSigDetailsModel {
  signers: SignerModel[];
  requiredSignatures: string;
}

export interface MultiSigProposalDetailsModel {
  approvalAmount: string;
  rejectionAmount: string;
  status: 'Invalid' | 'Active' | 'Expired' | 'ExecutionSuccessful' | 'ExecutionFailed' | 'Rejected';
  expiry?: Record<string, unknown> | null;
  autoClose: boolean;
  args: Record<string, unknown>;
  txTag: string;
  voted: string[];
}

export interface MultiSigProposalModel {
  multiSigAddress: string;
  proposalId: string;
  details: MultiSigProposalDetailsModel;
}

export interface MultiSigCreatedModel {
  transactions: unknown[];
  details: unknown[];
  proposal?: {
    multiSigAddress: string;
    id: string;
  };
  multiSigAddress: string;
}

export interface MultiSigAdmin {
  did: string;
}

export interface MultiSigPayer {
  did: string;
}

export interface PaginatedProposalsModel {
  results: MultiSigProposalModel[];
  total: string;
  next?: string;
}