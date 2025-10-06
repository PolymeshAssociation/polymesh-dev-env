import { StatType } from '@polymeshassociation/polymesh-sdk/types';

import { TxBase, TxExtras } from '~/rest/common';

export type MetadataType = 'Local' | 'Global';

const assetType = 'EquityCommon';

const defaultAssetParams = {
  assetType,
  initialSupply: '100000',
  isDivisible: false,
  requireInvestorUniqueness: false,
  securityIdentifiers: [{ type: 'Isin', value: 'US0846707026' }],
  fundingRound: 'Series A',
  documents: [
    {
      name: 'Test document',
      uri: 'https://example.com/',
      contentHash:
        '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      type: 'Private Placement Memorandum',
      filedAt: '2022-05-23T04:00:00.000Z',
    },
  ],
};

export const createAssetParams = (base: TxBase, extras: TxExtras = {}) =>
  ({
    name: 'Test Corp',
    ...defaultAssetParams,
    ...extras,
    ...base,
  } as const);

export const createMetadataParams = (base: TxBase, extras: TxExtras = {}) =>
  ({
    name: 'Metadata',
    specs: {
      url: 'https://example.com',
      description: 'Some description',
      typedef: 'Some example',
    },
    value: 'Some value',
    ...extras,
    ...base,
  } as const);

export const setMetadataParams = (base: TxBase, extras: TxExtras = {}) =>
  ({
    value: 'Set Value',
    details: {
      lockStatus: 'LockedUntil',
      lockedUntil: '2030-05-23T00:00:00.000Z',
    },
    ...extras,
    ...base,
  } as const);

export const setAssetDocumentParams = (base: TxBase, extras: TxExtras = {}) =>
  ({
    documents: [
      {
        name: 'Document 1',
        uri: 'https://example.com/document.pdf',
        type: 'PDF',
      },
      {
        name: 'Document 2',
        uri: 'https://example.com/document2.pdf',
        type: 'PDF',
      },
    ],
    ...extras,
    ...base,
  } as const);

export const redeemTokenParams = (from: string, base: TxBase, extras: TxExtras = {}) =>
  ({
    amount: '100',
    from,
    ...extras,
    ...base,
  } as const);

export const assetMediatorsParams = (mediators: string[], base: TxBase, extras: TxExtras = {}) =>
  ({
    mediators,
    ...extras,
    ...base,
  } as const);

export const transferAssetOwnershipParams = (
  newOwner: string,
  base: TxBase,
  extras: TxExtras = {}
) =>
  ({
    target: newOwner,
    ...extras,
    ...base,
  } as const);

export const issueAssetParams = (amount: number, base: TxBase, extras: TxExtras = {}) =>
  ({
    amount,
    ...extras,
    ...base,
  } as const);

export const controllerTransferParams = (
  origin: { did: string; id: string },
  amount: number,
  base: TxBase,
  extras: TxExtras = {}
) =>
  ({
    origin,
    amount,
    ...extras,
    ...base,
  } as const);

export const setTransferRestrictionStatsParams = (base: TxBase, extras: TxExtras = {}) =>
  ({
    stats: [
      {
        type: StatType.Balance,
      },
    ],
    ...extras,
    ...base,
  } as const);
