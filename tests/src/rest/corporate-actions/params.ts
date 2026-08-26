import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import { TargetTreatment } from '@polymeshassociation/polymesh-sdk/types';

import { TxBase, TxExtras } from '~/rest/common';

// Shape is intentionally flexible to allow tests to pass specific values.
// `currency` has no sane default (it must be the ticker of a real, existing Asset), so callers
// are expected to always override it via `extras`.
export const createDividendDistributionParams = (base: TxBase, extras: TxExtras = {}) =>
  ({
    description: 'A sample distribution',
    declarationDate: new Date(),
    // `Include: []` targets nobody; `Exclude: []` excludes nobody, i.e. everyone is included
    targets: {
      treatment: TargetTreatment.Exclude,
      identities: [],
    },
    defaultTaxWithholding: new BigNumber(10),
    taxWithholdings: [],
    checkpoint: new Date(Date.now() + 60_000),
    originPortfolio: new BigNumber(0),
    // small enough that paying out any single holder's full balance (potentially most of the
    // Asset's supply, when `currency` is the same Asset being distributed) stays under maxAmount
    perShare: new BigNumber(0.01),
    maxAmount: new BigNumber(1000),
    paymentDate: new Date(Date.now() + 120_000),
    expiryDate: new Date(Date.now() + 180_000),
    ...extras,
    ...base,
  } as const);

export const payDividendDistributionParams = (
  base: TxBase,
  extras: TxExtras = {},
  targets: string[]
) =>
  ({
    ...extras,
    ...base,
    targets,
  } as const);

export const claimDividendDistributionParams = (base: TxBase, extras: TxExtras = {}) =>
  ({
    ...extras,
    ...base,
  } as const);

export const reclaimDividendDistributionParams = (base: TxBase, extras: TxExtras = {}) =>
  ({
    ...extras,
    ...base,
  } as const);

export const modifyDistributionCheckpointParams = (
  base: TxBase,
  extras: TxExtras = {},
  checkpoint: { type: 'Existing' | 'Schedule'; id: string }
) =>
  ({
    ...extras,
    ...base,
    checkpoint,
  } as const);

export type CorporateActionTargets = {
  identities: string[];
  treatment: TargetTreatment;
};

export type CorporateActionTaxWithHoldings = {
  identity: string;
  percentage: BigNumber;
};

export const corporateActionDefaultConfigParams = (
  base: TxBase,
  defaultTaxWithholding?: BigNumber | undefined,
  targets?: CorporateActionTargets | undefined,
  taxWithholdings?: CorporateActionTaxWithHoldings[] | undefined,
  extras: TxExtras = {}
) =>
  ({
    targets,
    defaultTaxWithholding,
    taxWithholdings,
    ...extras,
    ...base,
  } as const);
