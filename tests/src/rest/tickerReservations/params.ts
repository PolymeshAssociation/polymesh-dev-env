import { TxBase, TxExtras } from '~/rest/common';

export const reserveTickerParams = (ticker: string, base: TxBase, extras: TxExtras = {}) =>
  ({
    ticker,
    ...extras,
    ...base,
  } as const);

export const transferTickerReservationParams = (
  target: string,
  base: TxBase,
  extras: TxExtras = {}
) =>
  ({
    target,
    expiry: '2100-01-23T00:00:00.000Z',
    ...extras,
    ...base,
  } as const);
