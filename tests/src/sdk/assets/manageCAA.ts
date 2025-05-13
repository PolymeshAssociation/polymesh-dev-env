import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset, ModuleName, PermissionType } from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

/*
  This script demonstrates Asset Corporate Action Agent (CAA) functionality. It:
    - Assigns a new CAA
    - Find and Accept the authorization to become CAA
    - Queries the current CAA
*/
export const manageCAA = async (
  sdk: Polymesh,
  targetDid: string,
  asset: FungibleAsset
): Promise<void> => {
  const [identity, target] = await Promise.all([
    sdk.getSigningIdentity(),
    sdk.identities.getIdentity({ did: targetDid }),
  ]);
  assert(identity);

  const setCorporateActionsAgentTx = await asset.permissions.inviteAgent({
    target,
    permissions: {
      transactions: {
        values: [
          ModuleName.CapitalDistribution,
          ModuleName.CorporateAction,
          ModuleName.CorporateBallot,
        ],
        type: PermissionType.Include,
      },
    },
  });

  const authRequest = await setCorporateActionsAgentTx.run();
  assert(setCorporateActionsAgentTx.isSuccess);

  const pendingAuthorizations = await target.authorizations.getReceived({ includeExpired: false });
  const becomeCAAAuth = pendingAuthorizations.find(({ authId }) => authId.eq(authRequest.authId));
  assert(becomeCAAAuth, 'the authorization should be findable by the target');

  const { account: targetAccount } = await target.getPrimaryAccount();

  const becomeCAATx = await becomeCAAAuth.accept({ signingAccount: targetAccount });
  await becomeCAATx.run();
  assert(becomeCAATx.isSuccess);

  // fetch an assets CAAs
  const corporateActionAgents = await asset.corporateActions.getAgents();
  assert(corporateActionAgents.length > 0, 'the asset should have a CAA');
};
