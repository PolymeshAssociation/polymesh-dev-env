import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import * as sdkTypes from '@polymeshassociation/polymesh-sdk/types';
import { FungibleAsset, Identity, TransferError } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { createAsset } from '~/sdk/assets/createAsset';

let factory: TestFactory;

/*
  Chain v8 aligned `TransferError` with the errors the chain actually reports. `canTransfer`
  now reports those failures in its breakdown instead of throwing.
*/
describe('transferErrors', () => {
  let sdk: Polymesh;
  let asset: FungibleAsset;
  let indivisibleAsset: FungibleAsset;
  let sender: Identity;
  let receiver: Identity;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    const signingIdentity = await sdk.getSigningIdentity();
    if (!signingIdentity) {
      throw new Error('the SDK should have a signing Identity');
    }
    sender = signingIdentity;

    const receiverAddress = factory.signingManager.addAccount({
      mnemonic: LocalSigningManager.generateAccount(),
    });

    const {
      results: [{ did: receiverDid }],
    } = await factory.createIdentityForAddresses([receiverAddress]);

    receiver = await sdk.identities.getIdentity({ did: receiverDid });

    // both assets are created by the same signing Account, so they cannot be submitted in parallel
    asset = await createAsset(sdk, { initialSupply: new BigNumber(100), isDivisible: true });
    indivisibleAsset = await createAsset(sdk, {
      initialSupply: new BigNumber(100),
      isDivisible: false,
    });

    const pauseTx = await asset.compliance.requirements.pause();
    await pauseTx.run();

    const pauseIndivisibleTx = await indivisibleAsset.compliance.requirements.pause();
    await pauseIndivisibleTx.run();
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should no longer export the TransferStatus enum', () => {
    expect(sdkTypes).not.toHaveProperty('TransferStatus');
  });

  it('should drop the transfer errors that cannot occur on chain v8', () => {
    const members = Object.values(TransferError);

    expect(members).not.toContain('InvalidReceiverCdd');
    expect(members).not.toContain('InvalidSenderCdd');
    expect(members).not.toContain('ScopeClaimMissing');
    expect(members).not.toContain('InvalidReceiverPortfolio');
  });

  it('should add an error for an inactive receiving Identity', () => {
    expect(Object.values(TransferError)).toContain(TransferError.InvalidReceiverIdentity);
  });

  it('should report a valid transfer as possible', async () => {
    const breakdown = await asset.settlements.canTransfer({
      from: sender,
      to: receiver,
      amount: new BigNumber(10),
    });

    expect(breakdown.general).toEqual([]);
    expect(breakdown.result).toBe(true);
  });

  it('should allow a transfer within the same Identity', async () => {
    // as of chain v8 an Identity may move funds between its own holders, so this is not a SelfTransfer
    const breakdown = await asset.settlements.canTransfer({
      from: sender,
      to: sender,
      amount: new BigNumber(10),
    });

    expect(breakdown.general).toEqual([]);
    expect(breakdown.result).toBe(true);
  });

  it('should report an insufficient balance instead of throwing', async () => {
    const breakdown = await asset.settlements.canTransfer({
      from: sender,
      to: receiver,
      amount: new BigNumber(1000000),
    });

    expect(breakdown.general).toEqual(expect.arrayContaining([expect.stringContaining('Balance')]));
    expect(breakdown.result).toBe(false);
  });

  it('should reject a decimal amount for a non divisible asset before reaching the chain', async () => {
    /*
      `InvalidGranularity` remains part of the enum for breakdowns produced by the chain, but the
      SDK rejects a decimal amount for an indivisible Asset while encoding the call
    */
    await expect(
      indivisibleAsset.settlements.canTransfer({
        from: sender,
        to: receiver,
        amount: new BigNumber(1.5),
      })
    ).rejects.toThrow(/indivisible/);

    const breakdown = await indivisibleAsset.settlements.canTransfer({
      from: sender,
      to: receiver,
      amount: new BigNumber(1),
    });

    expect(breakdown.general).not.toContain(TransferError.InvalidGranularity);
  });

  it('should report frozen transfers instead of throwing', async () => {
    const freezeTx = await asset.freeze();
    await freezeTx.run();

    const breakdown = await asset.settlements.canTransfer({
      from: sender,
      to: receiver,
      amount: new BigNumber(10),
    });

    expect(breakdown.general).toContain(TransferError.TransfersFrozen);
    expect(breakdown.result).toBe(false);

    const unfreezeTx = await asset.unfreeze();
    await unfreezeTx.run();
  });
});
