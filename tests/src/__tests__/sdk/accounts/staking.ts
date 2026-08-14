import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { Account } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';

let factory: TestFactory;
const handles = ['stash', 'payee'];

describe('staking', () => {
  let sdk: Polymesh;
  let stash: Account;
  let payee: Account;
  let unbondedAccount: Account;

  const bondAmount = new BigNumber(10);

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    sdk = factory.polymeshSdk;

    const stashMnemonic = LocalSigningManager.generateAccount();
    const stashAddress = factory.signingManager.addAccount({
      mnemonic: stashMnemonic,
    });
    const payeeMnemonic = LocalSigningManager.generateAccount();
    const payeeAddress = factory.signingManager.addAccount({
      mnemonic: payeeMnemonic,
    });
    const unbondedMnemonic = LocalSigningManager.generateAccount();
    const unbondedAddress = factory.signingManager.addAccount({
      mnemonic: unbondedMnemonic,
    });

    await factory.createIdentityForAddresses([stashAddress, payeeAddress, unbondedAddress]);

    [stash, payee, unbondedAccount] = await Promise.all([
      sdk.accountManagement.getAccount({ address: stashAddress }),
      sdk.accountManagement.getAccount({ address: payeeAddress }),
      sdk.accountManagement.getAccount({ address: unbondedAddress }),
    ]);
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should return a null payee for an Account that has never bonded', async () => {
    const currentPayee = await unbondedAccount.staking.getPayee();

    expect(currentPayee).toBeNull();
  });

  it('should allow an account to bond polyx', async () => {
    const bondTx = await sdk.staking.bond(
      {
        amount: bondAmount,
        payee: stash,
        autoStake: true,
      },
      { signingAccount: stash }
    );

    await expect(bondTx.run()).resolves.not.toThrow();

    const [currentController, currentPayee, currentLedger] = await Promise.all([
      stash.staking.getController(),
      stash.staking.getPayee(),
      stash.staking.getLedger(),
    ]);

    expect(currentController?.address).toEqual(stash.address);
    expect(currentPayee?.account.address).toEqual(stash.address);
    expect(currentPayee?.autoStaked).toEqual(true);
    expect(currentLedger?.stash.address).toEqual(stash.address);
  });

  it('should report bonded POLYX as reserved on the stash balance', async () => {
    const { free, locked, total, reserved, frozen } = await stash.getBalance();

    expect(reserved.gte(bondAmount)).toBe(true);
    expect(total).toEqual(free.plus(locked));
    expect(locked).toEqual(total.minus(free));
    expect(frozen.gte(0)).toBe(true);
  });

  it('should reject pairing a stash that is already its own controller', async () => {
    /*
      As of chain v8 a stash is bonded as its own controller, so `setController` only has an
      effect for legacy stashes that still have a separate controller
    */
    const currentController = await stash.staking.getController();
    expect(currentController?.address).toEqual(stash.address);

    const setControllerTx = await sdk.staking.setController({ signingAccount: stash });

    await expect(setControllerTx.run()).rejects.toThrow(/AlreadyPaired/);
  });

  it('should allow for a payee to be reassigned', async () => {
    const setPayeeTx = await sdk.staking.setPayee(
      { payee, autoStake: false },
      { signingAccount: stash }
    );

    await expect(setPayeeTx.run()).resolves.not.toThrow();

    const currentPayee = await stash.staking.getPayee();
    expect(currentPayee?.account.address).toEqual(payee.address);
    expect(currentPayee?.autoStaked).toEqual(false);
  });

  it('should allow for the stash to bond extra', async () => {
    const ledgerBefore = await stash.staking.getLedger();

    const bondMoreTx = await sdk.staking.bondExtra(
      { amount: new BigNumber(5) },
      { signingAccount: stash }
    );

    await expect(bondMoreTx.run()).resolves.not.toThrow();

    const ledgerAfter = await stash.staking.getLedger();

    expect(ledgerBefore?.total.plus(5)).toEqual(ledgerAfter?.total);
  });

  it('should allow for a controller to unbond', async () => {
    const unbondTx = await sdk.staking.unbond({ amount: bondAmount }, { signingAccount: stash });

    await expect(unbondTx.run()).resolves.not.toThrow();
  });

  it('should allow for the controller to call withdraw', async () => {
    const withdraw = await sdk.staking.withdraw({ signingAccount: stash });

    await expect(withdraw.run()).resolves.not.toThrow();
  });

  it('should be able to get network staking info', async () => {
    const result = await sdk.staking.eraInfo();

    expect(result).toEqual({
      activeEra: expect.any(BigNumber),
      activeEraStart: expect.any(BigNumber),
      currentEra: expect.any(BigNumber),
      plannedSession: expect.any(BigNumber),
      totalStaked: expect.any(BigNumber),
    });
  });

  it('should fetch validators', async () => {
    const validators = await sdk.staking.getValidators();

    expect(validators).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            account: expect.objectContaining({ address: expect.any(String) }),
          }),
        ]),
        next: null,
      })
    );
  });
});
