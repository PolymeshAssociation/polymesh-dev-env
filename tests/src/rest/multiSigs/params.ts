import { TxBase, TxExtras } from '~/rest/common';

export const createMultiSigParams = (
  signers: string[],
  requiredSignatures: string,
  base: TxBase,
  extras: TxExtras = {}
): Record<string, unknown> => ({
  signers,
  requiredSignatures,
  ...base,
  ...extras,
});

export const modifyMultiSigParams = (
  signers?: string[],
  requiredSignatures?: string,
  base?: TxBase,
  extras: TxExtras = {}
): Record<string, unknown> => ({
  ...(signers && { signers }),
  ...(requiredSignatures && { requiredSignatures }),
  ...(base && base),
  ...extras,
});

export const approveProposalParams = (base: TxBase, extras: TxExtras = {}): Record<string, unknown> => ({
  ...base,
  ...extras,
});

export const rejectProposalParams = (base: TxBase, extras: TxExtras = {}): Record<string, unknown> => ({
  ...base,
  ...extras,
});

export const setAdminParams = (admin: string, base: TxBase, extras: TxExtras = {}): Record<string, unknown> => ({
  admin,
  ...base,
  ...extras,
});

export const removeAdminParams = (base: TxBase, extras: TxExtras = {}): Record<string, unknown> => ({
  ...base,
  ...extras,
});

export const removePayerParams = (base: TxBase, extras: TxExtras = {}): Record<string, unknown> => ({
  ...base,
  ...extras,
});