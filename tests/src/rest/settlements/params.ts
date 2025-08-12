import { TxBase, TxExtras } from '~/rest/common';

export const venueParams = (base: TxBase, extras: TxExtras = {}) =>
  ({
    description: 'A test Venue',
    type: 'Exchange',
    ...extras,
    ...base,
  } as const);

export const fungibleInstructionParams = (
  assetId: string,
  from: string,
  to: string,
  base: TxBase,
  extras: TxExtras = {},
  endAfterBlock?: string
) =>
  ({
    memo: 'Testing settlements',
    legs: [
      {
        amount: '10',
        from: {
          did: from,
          id: 0,
        },
        to: {
          did: to,
          id: 0,
        },
        type: 'onChain',
        asset: assetId,
      },
    ],
    endAfterBlock,
    ...extras,
    ...base,
  } as const);

export const nftInstructionParams = (
  collectionId: string,
  from: string,
  to: string,
  nfts: string[],
  base: TxBase,
  extras: TxExtras = {}
) =>
  ({
    memo: 'Testing NFT settlement',
    legs: [
      {
        nfts,
        from: {
          did: from,
          id: 0,
        },
        to: {
          did: to,
          id: 0,
        },
        type: 'onChain',
        asset: collectionId,
      },
    ],
    ...extras,
    ...base,
  } as const);
