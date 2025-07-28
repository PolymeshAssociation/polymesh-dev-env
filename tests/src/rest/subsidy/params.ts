import { TxBase, TxExtras } from '~/rest/common';

export const createSubsidyParams = (beneficiary: string, base: TxBase, extras: TxExtras = {}) =>
  ({
    beneficiary,
    allowance: '10000',
    ...extras,
    ...base,
  } as const);

export const setSubsidyAllowanceParams = (
  beneficiary: string,
  allowance: number,
  base: TxBase,
  extras: TxExtras = {}
) =>
  ({
    beneficiary,
    allowance,
    ...extras,
    ...base,
  } as const);

export const quitSubsidyParams = (subsidizer: string, base: TxBase, extras: TxExtras = {}) =>
  ({
    subsidizer,
    ...extras,
    ...base,
  } as const);
