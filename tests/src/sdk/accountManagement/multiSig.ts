import { BigNumber, Polymesh } from "@polymeshassociation/polymesh-sdk";
import { TransactionStatus } from "@polymeshassociation/polymesh-sdk/types";
import assert from "node:assert";

import { awaitMiddlewareSynced } from "~/util";

/*
  This script showcases MultiSig related functionality. It:
    - Creates a MultiSig
    - Accept MultiSig authorizations
    - Joins the MultiSig to an Identity
    - Signing transactions with different accounts
*/
export const runMultiSigExamples = async (
  sdk: Polymesh,
  creatorAddress: string,
  signerOne: string,
  signerTwo: string
): Promise<void> => {
  const [signerOneAccount, signerTwoAccount] = await Promise.all([
    sdk.accountManagement.getAccount({ address: signerOne }),
    sdk.accountManagement.getAccount({ address: signerTwo }),
  ]);

  const createMultiSig = await sdk.accountManagement.createMultiSigAccount(
    {
      signers: [signerOneAccount, signerTwoAccount],
      requiredSignatures: new BigNumber(2),
      permissions: { assets: null, transactions: null, portfolios: null },
    },
    {
      signingAccount: creatorAddress,
    }
  );
  await createMultiSig.run();

  const [signerOneAuths, signerTwoAuths] = await Promise.all([
    signerOneAccount.authorizations.getReceived(),
    signerTwoAccount.authorizations.getReceived(),
  ]);

  const [signerOneAccept, signerTwoAccept] = await Promise.all([
    signerOneAuths[0].accept({ signingAccount: signerOne }),
    signerTwoAuths[0].accept({ signingAccount: signerTwo }),
  ]);

  await Promise.all([await signerOneAccept.run(), await signerTwoAccept.run()]);

  const createPortfolio = await sdk.identities.createPortfolio(
    {
      name: "MultiSig Portfolio",
    },
    { signingAccount: signerOne }
  );

  const portfolioProposal = await createPortfolio.runAsProposal();

  assert(createPortfolio.status === TransactionStatus.Succeeded);

  const acceptProposal = await portfolioProposal.approve({
    signingAccount: signerTwo,
  });
  assert(!acceptProposal.multiSig); // multiSig should not be set
  await acceptProposal.run();

  assert(acceptProposal.status === TransactionStatus.Succeeded);

  const reserveTicker = await sdk.assets.reserveTicker(
    {
      ticker: "MULTI",
    },
    { signingAccount: signerOne }
  );

  const reserveTickerProposal = await reserveTicker.runAsProposal();
  assert(reserveTicker.status === TransactionStatus.Succeeded);

  const rejectProposal = await reserveTickerProposal.reject({
    signingAccount: signerTwo,
  });

  await rejectProposal.run();

  assert(rejectProposal.status === TransactionStatus.Succeeded);

  await awaitMiddlewareSynced(rejectProposal, sdk, 15, 2000);
};
