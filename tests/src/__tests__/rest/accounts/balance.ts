import { BigNumber } from '@polymeshassociation/polymesh-sdk';

import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { Identity } from '~/rest/identities/interfaces';

const handles = ['holder'];
let factory: TestFactory;

/*
  Chain v8 changed how a POLYX balance is derived. `free` is now what the Account can actually
  spend, and the raw chain values are exposed as `reserved` and `frozen`.
*/
describe('Account Balance', () => {
  let restClient: RestClient;
  let holder: Identity;
  let address: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    holder = factory.getSignerIdentity(handles[0]);
    address = holder.primaryAccount.account.address;
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should expose the full POLYX balance breakdown', async () => {
    const balance = await restClient.accounts.getBalance(address);

    expect(balance).toMatchObject({
      free: expect.any(String),
      locked: expect.any(String),
      total: expect.any(String),
      reserved: expect.any(String),
      frozen: expect.any(String),
    });
  });

  it('should keep the balance components consistent', async () => {
    const { free, locked, total, reserved, frozen } = await restClient.accounts.getBalance(
      address
    );

    expect(new BigNumber(total)).toEqual(new BigNumber(free).plus(locked));
    expect(new BigNumber(free).gt(0)).toBe(true);
    expect(new BigNumber(reserved).gte(0)).toBe(true);
    expect(new BigNumber(frozen).gte(0)).toBe(true);
    expect(new BigNumber(locked).gte(reserved)).toBe(true);
  });
});
