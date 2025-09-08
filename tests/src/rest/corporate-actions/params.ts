import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import { TargetTreatment } from '@polymeshassociation/polymesh-sdk/types';
import { TxBase, TxExtras } from '~/rest/common';

// Shape is intentionally flexible to allow tests to pass specific values
export const createDividendDistributionParams = (base: TxBase, extras: TxExtras = {}) =>
  ({
    description: 'A sample distribution',
    declarationDate: new Date(),
    targets: {
      treatment: TargetTreatment.Include,
      identities: [],
    },
    defaultTaxWithholding: new BigNumber(10),
    taxWithholdings: [{ identity: '', percentage: new BigNumber(10) }],
    checkpoint: {
      type: 'Existing',
      id: '',
    },
    originPortfolio: new BigNumber(0),
    currency: 'TICKER',
    perShare: new BigNumber(10),
    maxAmount: new BigNumber(1000),
    paymentDate: new Date(),
    expiryDate: new Date(),
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
