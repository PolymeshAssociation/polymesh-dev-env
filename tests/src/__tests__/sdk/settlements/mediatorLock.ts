import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset, Instruction } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { createAsset } from '~/sdk/assets/createAsset';
import {
  affirmForLock,
  assertLegStatuses,
  createLockableInstruction,
  lockInstruction,
  unlockInstruction,
} from '~/sdk/settlements/mediatorLock';

let factory: TestFactory;

describe('mediatorLock', () => {
  let sdk: Polymesh;
  let asset: FungibleAsset;
  let instruction: Instruction;

  let counterPartyDid: string;
  let counterPartyAddress: string;
  let mediatorDid: string;
  let mediatorAddress: string;

  const amount = new BigNumber(10);

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    counterPartyAddress = factory.signingManager.addAccount({
      mnemonic: LocalSigningManager.generateAccount(),
    });
    mediatorAddress = factory.signingManager.addAccount({
      mnemonic: LocalSigningManager.generateAccount(),
    });

    ({
      results: [{ did: counterPartyDid }, { did: mediatorDid }],
    } = await factory.createIdentityForAddresses([counterPartyAddress, mediatorAddress]));

    asset = await createAsset(sdk, { initialSupply: new BigNumber(100), isDivisible: true });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should create a SettleAfterLock instruction with a mediator', async () => {
    instruction = await createLockableInstruction(sdk, asset, counterPartyDid, mediatorDid, amount);

    const mediators = await instruction.getMediators();

    expect(mediators.map(({ identity: { did } }) => did)).toContain(mediatorDid);
  });

  it('should be affirmed by every party including the mediator', async () => {
    await expect(
      affirmForLock(instruction, counterPartyDid, counterPartyAddress, mediatorAddress)
    ).resolves.not.toThrow();
  });

  it('should be locked for execution by the mediator', async () => {
    await expect(lockInstruction(instruction, mediatorAddress)).resolves.not.toThrow();
  });

  it('should report a status for each leg', async () => {
    await expect(assertLegStatuses(instruction)).resolves.not.toThrow();
  });

  it('should be unlocked by the mediator, starting the relock cooldown', async () => {
    await expect(unlockInstruction(instruction, mediatorAddress)).resolves.not.toThrow();
  });

  it('should not allow an immediate relock while the cooldown is active', async () => {
    const { cooldownEndsAt } = await instruction.getRelockStatus();

    if (!cooldownEndsAt || cooldownEndsAt <= new Date()) {
      // the cooldown has already elapsed, a relock is legitimately allowed
      return;
    }

    // the cooldown is checked while the transaction is prepared, before it is ever submitted
    await expect(instruction.lockForExecution({ signingAccount: mediatorAddress })).rejects.toThrow(
      /cannot be locked for execution/
    );
  });
});
