import { ClaimType } from '@polymeshassociation/polymesh-sdk/types';

import { TxBase, TxExtras } from '~/rest/common';

type Claim = {
  target: string;
  claim: {
    type: ClaimType;
    scope?: {
      type: string;
      value: string;
    };
    code?: string;
    customClaimTypeId?: number;
    cddId?: string;
    trustedClaimIssuers?: Array<{
      trustedFor: null;
      identity: string;
    }>;
  };
  expiry?: string;
};

export type CreateClaimParams = {
  signer: string;
  dryRun: boolean;
  claims: Claim[];
  extras?: TxExtras;
};

export const registerCustomClaimTypeParams = (name: string, base: TxBase, extras: TxExtras = {}) =>
  ({
    name,
    ...extras,
    ...base,
  } as const);

export const createClaimParams = (params: CreateClaimParams) =>
  ({
    ...params,
  } as const);
