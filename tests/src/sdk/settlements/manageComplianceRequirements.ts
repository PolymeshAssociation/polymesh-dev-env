import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  ClaimType,
  ConditionTarget,
  ConditionType,
  CountryCode,
  FungibleAsset,
  ScopeType,
} from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

/*
  This script showcases Compliance related functionality. Covered functionality:
    - Setting Compliance rules
    - Getting existing Compliance rules
    - Pausing Compliance rules
    - Unpausing Compliance rules
    - Adding new requirements to existing Compliance rules
    - Removing a Compliance rule
*/
export const manageComplianceRequirements = async (
  sdk: Polymesh,
  asset: FungibleAsset
): Promise<void> => {
  const identity = await sdk.getSigningIdentity();
  assert(identity);

  // destructure to reduce `asset.` repetition
  const { compliance } = asset;

  /*
    Set compliance requirements for the Asset. Instructions will be rejected if any party fails to comply with a rule.

    The compliance engine will apply logical "or" between elements in the outer Array, and logical "and" for the inner ones

    This rule will allow the `identity` to trade with anyone, other identities must be claimed as "Accredited" to own the Asset
   */
  const setRequirementsTx = await compliance.requirements.set({
    requirements: [
      [
        {
          type: ConditionType.IsIdentity,
          target: ConditionTarget.Sender,
          identity,
        },
      ],
      [
        {
          type: ConditionType.IsPresent,
          claim: {
            type: ClaimType.Accredited,
            scope: {
              type: ScopeType.Asset,
              value: asset.id,
            },
          },
          target: ConditionTarget.Both,
          trustedClaimIssuers: [{ identity, trustedFor: null }],
        },
      ],
    ],
  });
  await setRequirementsTx.run();
  assert(setRequirementsTx.isSuccess);

  // Allow for non blocked, non US residents to own and trade the Asset
  const addRequirementsTx = await compliance.requirements.add({
    conditions: [
      {
        type: ConditionType.IsNoneOf,
        claims: [
          {
            type: ClaimType.Jurisdiction,
            code: CountryCode.Us,
            scope: {
              type: ScopeType.Asset,
              value: asset.id,
            },
          },
          {
            type: ClaimType.Blocked,
            scope: {
              type: ScopeType.Asset,
              value: asset.id,
            },
          },
        ],
        target: ConditionTarget.Both,
      },
    ],
  });
  await addRequirementsTx.run();
  assert(addRequirementsTx.isSuccess);

  const { requirements } = await compliance.requirements.get();
  assert(requirements.length > 0, 'there should be at least one requirement');
  const removeRequirementTx = await compliance.requirements.remove({
    requirement: requirements[0], // A requirement can also be specified by its ID
  });
  await removeRequirementTx.run();
  assert(removeRequirementTx.isSuccess);

  // compliance can be paused if it is going to be enforced off chain
  const pauseTx = await compliance.requirements.pause();
  await pauseTx.run();
  assert(pauseTx.isSuccess);

  const isPaused = await compliance.requirements.arePaused();
  assert(isPaused);

  // compliance can unpaused at a later date
  const unpauseTx = await compliance.requirements.unpause();
  await unpauseTx.run();
  assert(unpauseTx.isSuccess);
};
