import { Polymesh } from '@polymeshassociation/polymesh-sdk';

import { TestFactory } from '~/helpers';
import { tickerReservation } from '~/sdk/assets/tickerReservation';

let factory: TestFactory;

describe('tickerReservation', () => {
  let ticker: string;
  let sdk: Polymesh;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    ticker = factory.nextTicker();
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should execute tickerReservation without errors', async () => {
    await expect(tickerReservation(sdk, ticker)).resolves.not.toThrow();
  });
});
