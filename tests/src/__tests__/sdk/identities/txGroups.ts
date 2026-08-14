import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  AGENT_TX_GROUP_VALUES,
  DID_REGISTRATION_TX_TAGS,
  INSTRUCTION_MEDIATION_TX_TAGS,
  ISSUANCE_TX_TAGS,
  MULTISIG_MANAGEMENT_TX_TAGS,
  TX_GROUP_TO_TAGS_MAP,
  TxGroup,
  TxTags,
} from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';

let factory: TestFactory;

/*
  Chain v8 rebuilt the transaction groups from the chain's own permission model. These tests
  pin the resulting mapping so a regression in the constants is caught without a chain round trip,
  and then confirm the newly grantable groups can actually be granted on chain.
*/
describe('txGroups', () => {
  let sdk: Polymesh;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should no longer expose a RelayerManagement group', () => {
    expect(Object.values(TxGroup)).not.toContain('RelayerManagement');
    expect(TX_GROUP_TO_TAGS_MAP).not.toHaveProperty('RelayerManagement');
  });

  it('should expose the DidRegistration group', () => {
    expect(Object.values(TxGroup)).toContain(TxGroup.DidRegistration);
    expect(DID_REGISTRATION_TX_TAGS).toEqual([TxTags.identity.RegisterDid]);
    expect(TX_GROUP_TO_TAGS_MAP[TxGroup.DidRegistration]).toEqual([TxTags.identity.RegisterDid]);
  });

  it('should expose the InstructionMediation group with the mediator transactions', () => {
    expect(Object.values(TxGroup)).toContain(TxGroup.InstructionMediation);
    expect(INSTRUCTION_MEDIATION_TX_TAGS).toEqual(
      expect.arrayContaining([
        TxTags.settlement.AffirmInstructionAsMediator,
        TxTags.settlement.RejectInstructionAsMediator,
        TxTags.settlement.LockInstruction,
        TxTags.settlement.UnlockInstruction,
      ])
    );
    expect(TX_GROUP_TO_TAGS_MAP[TxGroup.InstructionMediation]).toEqual([
      ...INSTRUCTION_MEDIATION_TX_TAGS,
    ]);
  });

  it('should reduce MultiSigManagement to the only permission checked call', () => {
    expect(MULTISIG_MANAGEMENT_TX_TAGS).toEqual([TxTags.multiSig.CreateMultisig]);
  });

  it('should make nft.createNftCollection grantable to External Agents', () => {
    expect(ISSUANCE_TX_TAGS).toContain(TxTags.nft.CreateNftCollection);
    expect(AGENT_TX_GROUP_VALUES).toContain(TxGroup.Issuance);
  });

  it('should not offer the mediation or registration groups to External Agents', () => {
    expect(AGENT_TX_GROUP_VALUES).not.toContain(TxGroup.InstructionMediation);
    expect(AGENT_TX_GROUP_VALUES).not.toContain(TxGroup.DidRegistration);
  });

  it('should not map any tag for an extrinsic removed from the chain', () => {
    const allTags = Object.values(TX_GROUP_TO_TAGS_MAP).flat();

    ['settlement.addInstructionWithMemo', 'settlement.addAndAffirmInstructionWithMemo'].forEach(
      (tag) => {
        expect(allTags).not.toContain(tag);
      }
    );
  });

  it('should grant the new groups to a secondary key', async () => {
    const secondaryKey = factory.signingManager.addAccount({
      mnemonic: LocalSigningManager.generateAccount(),
    });

    const inviteTx = await sdk.accountManagement.inviteAccount({
      targetAccount: secondaryKey,
      permissions: {
        assets: null,
        portfolios: null,
        transactionGroups: [TxGroup.InstructionMediation, TxGroup.DidRegistration],
      },
    });

    const authorization = await inviteTx.run();

    expect(inviteTx.isSuccess).toBe(true);

    const acceptTx = await authorization.accept({ signingAccount: secondaryKey });
    await acceptTx.run();

    expect(acceptTx.isSuccess).toBe(true);

    const account = await sdk.accountManagement.getAccount({ address: secondaryKey });
    const { transactions } = await account.getPermissions();

    expect(transactions?.values).toEqual(
      expect.arrayContaining([...INSTRUCTION_MEDIATION_TX_TAGS, ...DID_REGISTRATION_TX_TAGS])
    );
  });
});
