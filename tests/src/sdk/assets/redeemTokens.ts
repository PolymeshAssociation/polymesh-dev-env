import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import {
  DefaultPortfolio,
  FungibleAsset,
  NumberedPortfolio,
} from '@polymeshassociation/polymesh-sdk/types';
import { assert } from 'console';

/*
  This script showcases how to redeem tokens for an Asset.

   Note, for this script to work an Asset with the ticker must be made, and the signer has permission to issue tokens for it
*/
export const redeemTokens = async (
  asset: FungibleAsset,
  amount: BigNumber,
  from?: BigNumber | DefaultPortfolio | NumberedPortfolio
): Promise<void> => {
  const { owner: identity } = await asset.details();

  const { account: signingAccount } = await identity.getPrimaryAccount();

  const redeemTokensTx = await asset.redeem(
    { amount: new BigNumber(amount), from },
    { signingAccount }
  );
  await redeemTokensTx.run();
  assert(redeemTokensTx.isSuccess);
};
