import { Polymesh } from "@polymeshassociation/polymesh-sdk";
import assert from "node:assert";

import { awaitMiddlewareSynced } from "~/util";

/*
  This script showcases Portfolio's Custodian related functionality. It:
    - Creates a Portfolio
    - Fetches owner and Custodian for that Portfolio
    - Sets a different Custodian to that Portfolio
    - Fetches owned Portfolios
    - Fetches Portfolios in custody
    - Quits Portfolio custody

  It assumes the custodian's primary Account is present in the SDK's signing manager
*/
export const portfolioCustody = async (
  sdk: Polymesh,
  custodianDid: string
): Promise<void> => {
  const custodian = await sdk.identities.getIdentity({ did: custodianDid });
  const { account: custodianAccount } = await custodian.getPrimaryAccount();

  const identity = await sdk.getSigningIdentity();
  assert(identity);

  const createPortfolioTx = await sdk.identities.createPortfolio({
    name: "CUSTODY_PORTFOLIO",
  });
  const portfolio = await createPortfolioTx.run();
  assert(createPortfolioTx.isSuccess);

  // Here is how to check ownership and custody of a Portfolio
  const [portfolioCustodian, isOwnedByIdentity, isCustodiedByIdentity] =
    await Promise.all([
      portfolio.getCustodian(),
      portfolio.isOwnedBy({ identity }),
      portfolio.isCustodiedBy({ identity }),
    ]);
  assert(
    portfolioCustodian.did === identity.did,
    `Portfolio custodian should be: ${identity.did}`
  );
  assert(isOwnedByIdentity, `Portfolio is should be owned by ${identity.did}`);
  assert(
    isCustodiedByIdentity,
    `Portfolio is should be custodied by ${identity.did}`
  );

  const setCustodianTx = await portfolio.setCustodian({
    targetIdentity: custodian,
  });

  // The auth request can also be retrieved with `custodian.authorizations.getReceived()`
  const authRequest = await setCustodianTx.run();
  assert(setCustodianTx.isSuccess);

  // `.getReceived` can be called and inspected instead
  custodian.authorizations.getOne({ id: authRequest.authId });

  // The custodian needs to accept the created authorization
  const acceptTx = await authRequest.accept({
    signingAccount: custodianAccount,
  });

  await acceptTx.run();
  assert(acceptTx.isSuccess);

  const [newCustodian, isCustodiedByOwner] = await Promise.all([
    portfolio.getCustodian(),
    portfolio.isCustodiedBy({ identity }),
  ]);

  assert(
    newCustodian.did === custodian.did,
    `DID ${custodian.did} should now be the custodian of the Portfolio`
  );
  assert(
    !isCustodiedByOwner,
    `DID ${identity.did} should no longer be be the custodian`
  );

  await awaitMiddlewareSynced(acceptTx, sdk);

  // The custodian can get all non owned portfolios where they are the custodian - note there are pagination options
  const custodiedPortfolios =
    await custodian.portfolios.getCustodiedPortfolios();

  // Quit being a custodian of a Portfolio
  const [portfolioToQuit] = custodiedPortfolios.data;

  const quitCustodyTx = await portfolioToQuit.quitCustody({
    signingAccount: custodianAccount,
  });
  await quitCustodyTx.run();
  assert(quitCustodyTx.isSuccess);
};
