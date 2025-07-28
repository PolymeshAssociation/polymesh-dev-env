import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { Account } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';

let factory: TestFactory;
const handles = ['stash', 'controller', 'payee'];

describe('staking', () => {
  let sdk: Polymesh;
  let stash: Account;
  let controller: Account;
  let payee: Account;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    sdk = factory.polymeshSdk;

    const stashMnemonic = LocalSigningManager.generateAccount();
    const stashAddress = factory.signingManager.addAccount({
      mnemonic: stashMnemonic,
    });
    const controllerMnemonic = LocalSigningManager.generateAccount();
    const controllerAddress = factory.signingManager.addAccount({
      mnemonic: controllerMnemonic,
    });
    const payeeMnemonic = LocalSigningManager.generateAccount();
    const payeeAddress = factory.signingManager.addAccount({
      mnemonic: payeeMnemonic,
    });

    await factory.createIdentityForAddresses([stashAddress, controllerAddress, payeeAddress]);

    [stash, controller, payee] = await Promise.all([
      sdk.accountManagement.getAccount({ address: stashAddress }),
      sdk.accountManagement.getAccount({ address: controllerAddress }),
      sdk.accountManagement.getAccount({ address: payeeAddress }),
    ]);
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should allow an account to bond polyx', async () => {
    const bondTx = await sdk.staking.bond(
      {
        amount: new BigNumber(10),
        controller: stash,
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

  it('should allow for a controller to be reassigned', async () => {
    const setControllerTx = await sdk.staking.setController(
      { controller },
      { signingAccount: stash }
    );

    await expect(setControllerTx.run()).resolves.not.toThrow();

    const currentController = await stash.staking.getController();
    expect(currentController?.address).toEqual(controller.address);
  });

  it('should allow for a payee to be reassigned', async () => {
    const setPayeeTx = await sdk.staking.setPayee(
      { payee, autoStake: false },
      { signingAccount: controller }
    );

    await expect(setPayeeTx.run()).resolves.not.toThrow();

    const currentPayee = await stash.staking.getPayee();
    expect(currentPayee?.account.address).toEqual(payee.address);
    expect(currentPayee?.autoStaked).toEqual(false);
  });

  it('should allow for the stash to bond extra', async () => {
    const ledgerBefore = await controller.staking.getLedger();

    const bondMoreTx = await sdk.staking.bondExtra(
      { amount: new BigNumber(5) },
      { signingAccount: stash }
    );

    await expect(bondMoreTx.run()).resolves.not.toThrow();

    const ledgerAfter = await controller.staking.getLedger();

    expect(ledgerBefore?.total.plus(5)).toEqual(ledgerAfter?.total);
  });

  it('should allow for a controller to unbond', async () => {
    const unbondTx = await sdk.staking.unbond(
      { amount: new BigNumber(10) },
      { signingAccount: controller }
    );

    await expect(unbondTx.run()).resolves.not.toThrow();
  });

  it('should allow for the controller to call withdraw', async () => {
    const withdraw = await sdk.staking.withdraw({ signingAccount: controller });

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
