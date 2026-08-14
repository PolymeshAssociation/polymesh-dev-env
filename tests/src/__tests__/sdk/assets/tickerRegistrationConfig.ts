import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { KnownAssetType } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';

let factory: TestFactory;

describe('tickerRegistrationConfig', () => {
  let sdk: Polymesh;
  let maxTickerLength: BigNumber;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    ({ maxTickerLength } = await sdk.assets.getTickerRegistrationConfig());
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should fetch the chain wide ticker registration config', async () => {
    const config = await sdk.assets.getTickerRegistrationConfig();

    expect(config).toEqual({
      maxTickerLength: expect.any(BigNumber),
      registrationLength: expect.anything(),
    });

    expect(config.maxTickerLength.gt(0)).toBe(true);

    // a null `registrationLength` means reservations never expire
    if (config.registrationLength !== null) {
      expect(config.registrationLength.gt(0)).toBe(true);
    }
  });

  it('should reject reserving a ticker longer than the chain allows', async () => {
    const tooLong = 'A'.repeat(maxTickerLength.toNumber() + 1);

    await expect(sdk.assets.reserveTicker({ ticker: tooLong })).rejects.toThrow();
  });

  it('should reject creating an Asset with a ticker longer than the chain allows', async () => {
    const tooLong = 'A'.repeat(maxTickerLength.toNumber() + 1);

    await expect(
      sdk.assets.createAsset({
        ticker: tooLong,
        name: 'Too long ticker',
        isDivisible: true,
        assetType: KnownAssetType.EquityCommon,
      })
    ).rejects.toThrow();
  });

  it('should accept a ticker exactly at the maximum allowed length', async () => {
    const max = maxTickerLength.toNumber();
    const base = factory.nextTicker();
    const ticker = base.length >= max ? base.slice(0, max) : base.padEnd(max, 'Z');

    expect(ticker.length).toEqual(max);

    const reserveTx = await sdk.assets.reserveTicker({ ticker });
    const reservation = await reserveTx.run();

    expect(reserveTx.isSuccess).toBe(true);
    expect(reservation.ticker).toEqual(ticker);
  });
});
