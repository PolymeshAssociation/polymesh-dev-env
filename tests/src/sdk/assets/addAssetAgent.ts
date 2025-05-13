import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/internal';
import { PermissionGroupType } from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

/*
  This script demonstrates Asset PIA functionality. It:
    - Queries the current PIA
    - Invites a new Agent
*/
export const addAssetAgent = async (
  sdk: Polymesh,
  targetDid: string,
  asset: FungibleAsset
): Promise<void> => {
  const signingIdentity = await sdk.getSigningIdentity();
  assert(signingIdentity);

  const target = await sdk.identities.getIdentity({
    did: targetDid,
  });
  const { account: targetAccount } = await target.getPrimaryAccount();

  // Fetch full agents of the Asset
  const { fullAgents } = await asset.details();
  assert(
    fullAgents.find(({ did }) => did === signingIdentity.did),
    'Signer should be a full agent'
  );

  // Note, custom permission groups can be made to limit the actions of particular agents
  const fullPermissions = await asset.permissions.getGroup({ type: PermissionGroupType.Full });

  const invitingFullAgentTx = await asset.permissions.inviteAgent({
    target,
    permissions: fullPermissions,
  });
  const authRequest = await invitingFullAgentTx.run();
  assert(invitingFullAgentTx.isSuccess);

  // prepare and accept becoming an agent
  const acceptAgentTx = await authRequest.accept({ signingAccount: targetAccount });
  await acceptAgentTx.run();
  assert(acceptAgentTx.isSuccess);
};
