import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { TxTags } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';

let factory: TestFactory;

/*
  The protocol fee mapping was corrected against the v8 runtime. Fees for priced operations are
  no longer silently reported as zero.
*/
describe('protocolFees', () => {
  let sdk: Polymesh;

  const pricedTags = [
    TxTags.asset.CreateAsset,
    TxTags.asset.RegisterUniqueTicker,
    TxTags.identity.RegisterDid,
  ];

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should return a fee for each requested tag', async () => {
    const fees = await sdk.network.getProtocolFees({ tags: pricedTags });

    expect(fees).toHaveLength(pricedTags.length);

    fees.forEach(({ tag, fees: fee }) => {
      expect(pricedTags).toContain(tag);
      expect(fee).toEqual(expect.any(BigNumber));
      expect(fee.gte(0)).toBe(true);
    });
  });

  it('should not report a zero fee for priced operations', async () => {
    const fees = await sdk.network.getProtocolFees({
      tags: [TxTags.asset.CreateAsset, TxTags.asset.RegisterUniqueTicker],
    });

    fees.forEach(({ tag, fees: fee }) => {
      expect(fee.gt(0)).toBe(true);
      expect(tag).toBeDefined();
    });
  });

  it('should agree with the fee quoted by a prepared transaction', async () => {
    const [{ fees: quotedFee }] = await sdk.network.getProtocolFees({
      tags: [TxTags.asset.RegisterUniqueTicker],
    });

    const reserveTx = await sdk.assets.reserveTicker({ ticker: factory.nextTicker() });
    const {
      fees: { protocol },
    } = await reserveTx.getTotalFees();

    expect(protocol).toEqual(quotedFee);
  });
});
