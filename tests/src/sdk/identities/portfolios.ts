import { BigNumber, Polymesh } from "@polymeshassociation/polymesh-sdk";
import {
  FungibleAsset,
  NumberedPortfolio,
} from "@polymeshassociation/polymesh-sdk/types";
import assert from "node:assert";

import { randomNonce } from "~/util";

export const createPortfolio = async (
  sdk: Polymesh,
  nonce: string
): Promise<NumberedPortfolio> => {
  const signingIdentity = await sdk.getSigningIdentity();
  assert(signingIdentity);

  const portfolioTx = await sdk.identities.createPortfolio({
    name: `TEST-${nonce}`,
  });
  const portfolio = await portfolioTx.run();

  return portfolio;
};

/*
  This script showcases Portfolio related functionality. It:
    - Creates a Portfolio
    - Renames a Portfolio
    - Fetches an Identity's Portfolios
    - Fetches a Portfolio's Balances
    - Moves tokens between Portfolios
    - Redeems tokens from Portfolio
    - Deletes a Portfolio
*/
export const managePortfolios = async (
  sdk: Polymesh,
  asset: FungibleAsset
): Promise<void> => {
  const signingIdentity = await sdk.getSigningIdentity();
  assert(signingIdentity);

  const nonce = randomNonce(12);
  const portfolio = await createPortfolio(sdk, nonce);

  const renameTx = await portfolio.modifyName({ name: `RENAME-${nonce}` });
  await renameTx.run();
  assert(renameTx.isSuccess);

  // Get the portfolios of the Identity. First element is always the default Portfolio
  const [defaultPortfolio, examplePortfolio] =
    await signingIdentity.portfolios.getPortfolios();

  const amount = new BigNumber(3);
  const [{ free: freeBalance }] = await defaultPortfolio.getAssetBalances({
    assets: [asset],
  });

  assert(
    freeBalance.gt(amount),
    `The default portfolio does not have sufficient balance to move ${asset.id}`
  );

  const transferTx = await defaultPortfolio.moveFunds({
    to: examplePortfolio,
    items: [{ asset, amount }],
  });
  await transferTx.run();
  assert(transferTx.isSuccess);

  const customPortfolioBalanceAfter = await examplePortfolio.getAssetBalances({
    assets: [asset.id],
  });

  const [{ total: tokensInCustomPortfolio }] = customPortfolioBalanceAfter;

  // Redeem from the receiving portfolio, aka "burn", removes tokens from the chain.
  const redeemTx = await asset.redeem({
    amount: tokensInCustomPortfolio,
    from: examplePortfolio.id,
  });
  await redeemTx.run();
  assert(redeemTx.isSuccess);

  // Will throw an error if the Portfolio has any assets
  const deleteTx = await signingIdentity.portfolios.delete({
    portfolio: examplePortfolio,
  });
  await deleteTx.run();
  assert(deleteTx.isSuccess);
};
