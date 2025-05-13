import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/types';
import assert from 'assert';

/*
  This script showcases how to issue tokens for an Asset.

  Note, for this script to work an Asset with the ticker must be made, and the signer has permission to issue tokens for it
*/
export const issueTokens = async (
  asset: FungibleAsset,
  amount: BigNumber,
  portfolioId?: BigNumber
): Promise<void> => {
  // Sign with the owner of the Asset. This assumes `signingAccount` is present in the SDK's SigningManager
  const { owner } = await asset.details();
  const { account: signingAccount } = await owner.getPrimaryAccount();

  // Prepare and execute Asset issuance
  const issueTokensTx = await asset.issuance.issue({ amount, portfolioId }, { signingAccount });

  await issueTokensTx.run();
  assert(issueTokensTx.isSuccess);
};
