import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { Account } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';

let factory: TestFactory;

/*
  Chain v8 changed how a POLYX balance is derived. `free` is now what the Account can actually
  spend, and the raw chain values are exposed as `reserved` and `frozen`.
*/
describe('accountBalance', () => {
  let sdk: Polymesh;
  let account: Account;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    account = sdk.accountManagement.getSigningAccount() as Account;
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should expose the full POLYX balance breakdown', async () => {
    const balance = await account.getBalance();

    expect(balance).toEqual({
      free: expect.any(BigNumber),
      locked: expect.any(BigNumber),
      total: expect.any(BigNumber),
      reserved: expect.any(BigNumber),
      frozen: expect.any(BigNumber),
    });
  });

  it('should keep the balance components consistent', async () => {
    const { free, locked, total, reserved, frozen } = await account.getBalance();

    expect(total).toEqual(free.plus(locked));
    expect(locked).toEqual(total.minus(free));
    expect(free.gte(0)).toBe(true);
    expect(reserved.gte(0)).toBe(true);
    expect(frozen.gte(0)).toBe(true);
    expect(locked.gte(reserved)).toBe(true);
  });

  it('should report a spendable free balance for a funded Account', async () => {
    const { free, total } = await account.getBalance();

    expect(free.gt(0)).toBe(true);
    expect(free.lte(total)).toBe(true);
  });

  it('should return the same balance through accountManagement', async () => {
    const [fromAccount, fromManagement] = await Promise.all([
      account.getBalance(),
      sdk.accountManagement.getAccountBalance({ account }),
    ]);

    expect(fromManagement).toEqual(fromAccount);
  });
});
