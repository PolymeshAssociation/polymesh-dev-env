import { TxBase, TxExtras } from '~/rest/common';

export type MetadataType = 'Local' | 'Global';

const nftType = 'Derivative';

const defaultCollectionParams = {
  nftType,
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

export const createNftCollectionParams = (
  collectionKeys: Record<string, unknown>[],
  base: TxBase,
  extras: TxExtras = {}
) =>
  ({
    name: 'Test Collection',
    collectionKeys,
    ...defaultCollectionParams,
    ...extras,
    ...base,
  } as const);

export const issueNftParams = (
  ticker: string,
  metadata: Record<string, unknown>[],
  base: TxBase,
  extras: TxExtras = {}
) =>
  ({
    name: `Test Collection - ${ticker}`,
    ticker,
    metadata,
    ...extras,
    ...base,
  } as const);
