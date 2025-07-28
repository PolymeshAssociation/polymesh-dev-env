import {
  ClaimType,
  ConditionTarget,
  ConditionType,
  ScopeType,
} from '@polymeshassociation/polymesh-sdk/types';

import { TxBase, TxExtras } from '~/rest/common';

type ClaimParams = {
  type: ClaimType;
  scope?: { type: ScopeType; value: string };
  code?: string;
};

export type ConditionParams = {
  target: ConditionTarget;
  type: ConditionType;
  trustedClaimIssuers?: { trustedFor: ClaimType[]; identity: string }[];
  claim?: ClaimParams;
  claims?: ClaimParams[];
  identity?: string;
};

export const bothConditionsRequirements = (
  issuer: string,
  asset: string,
  blockedIdentity: string,
  blockedJurisdiction: string
): ConditionParams[] => [
  {
    target: ConditionTarget.Both,
    type: ConditionType.IsNoneOf,
    claims: [
      {
        type: ClaimType.Blocked,
        scope: { type: ScopeType.Identity, value: blockedIdentity },
      },
      {
        type: ClaimType.Jurisdiction,
        scope: { type: ScopeType.Asset, value: asset },
        code: blockedJurisdiction,
      },
    ],
    trustedClaimIssuers: [{ trustedFor: [ClaimType.Blocked], identity: issuer }],
  },
];

export const kycRequirements = (asset: string, trustedIdentity: string): ConditionParams[] => [
  {
    target: ConditionTarget.Receiver,
    type: ConditionType.IsPresent,
    claim: {
      type: ClaimType.KnowYourCustomer,
      scope: { type: ScopeType.Asset, value: asset },
    },
    trustedClaimIssuers: [
      {
        trustedFor: [ClaimType.KnowYourCustomer],
        identity: trustedIdentity,
      },
    ],
  },
];

export const blockedJurisdictionRequirements = (
  asset: string,
  trustedIdentity: string,
  code: string
): ConditionParams[] => [
  {
    target: ConditionTarget.Receiver,
    type: ConditionType.IsAbsent,
    claim: {
      type: ClaimType.Jurisdiction,
      scope: { type: ScopeType.Asset, value: asset },
      code,
    },
    trustedClaimIssuers: [
      {
        trustedFor: [ClaimType.Jurisdiction],
        identity: trustedIdentity,
      },
    ],
  },
];

export const blockedIdentityRequirements = (
  asset: string,
  targetIdentity: string
): ConditionParams[] => [
  {
    target: ConditionTarget.Receiver,
    type: ConditionType.IsAbsent,
    claim: {
      type: ClaimType.Blocked,
      scope: { type: ScopeType.Asset, value: asset },
    },
    trustedClaimIssuers: [
      {
        trustedFor: [ClaimType.Blocked],
        identity: targetIdentity,
      },
    ],
  },
];

export const receiverConditionsRequirements = (identity: string): ConditionParams[] => [
  {
    target: ConditionTarget.Receiver,
    type: ConditionType.IsIdentity,
    identity,
  },
];

export const senderConditionsRequirements = (identity: string): ConditionParams[] => [
  {
    target: ConditionTarget.Sender,
    type: ConditionType.IsIdentity,
    identity,
  },
];

export const complianceRequirementsParams = (
  requirements: ConditionParams[][],
  base: TxBase,
  extras: TxExtras = {}
) =>
  ({
    requirements,
    ...extras,
    ...base,
  } as const);

export const complianceRequirementParams = (
  conditions: ConditionParams[],
  base: TxBase,
  extras: TxExtras = {}
) =>
  ({
    conditions,
    ...extras,
    ...base,
  } as const);
