import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { TargetTreatment } from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

import { wellKnown } from '~/consts';

/*
  This script showcases Dividend Distribution related functionality. It:
    - Creates a Dividend Distribution
    - Modifies its Checkpoint
    - Links documents to the Corporate Action and fetches them back
    - Fetches the Distribution details
    - Fetches all the Distribution participants
    - Pushes dividend payments
    - Claims dividend payment
    - Reclaims remaining funds
    - Fetches Dividend Distributions
*/
export const manageDistributions = async (
  sdk: Polymesh,
  ticker: string,
  distributionTicker: string
): Promise<void> => {
  const signingIdentity = await sdk.getSigningIdentity();
  assert(signingIdentity);

  const alice = await sdk.identities.getIdentity({ did: wellKnown.alice.did });

  // The signing identity should be an agent of the Asset and have appropriate permission
  const asset = await sdk.assets.getFungibleAsset({ ticker });

  // fetch all current distributions for the Asset
  const allDistributions = await asset.corporateActions.distributions.get();
  assert(Array.isArray(allDistributions), 'allDistributions should be an array');

  const paymentDate = new Date();
  paymentDate.setDate(paymentDate.getDate() + 30);

  // create a checkpoint, the recipients will be calculated by their balance at this checkpoint
  const checkpointTx = await asset.checkpoints.create();
  const checkpoint = await checkpointTx.run();
  assert(checkpointTx.isSuccess);

  const declarationDate = new Date();
  declarationDate.setDate(declarationDate.getDate() - 1);
  // this creates a Corporate Action under the hood and then uses it to create the Dividend Distribution
  const createDistributionTx =
    await asset.corporateActions.distributions.configureDividendDistribution({
      checkpoint,
      currency: distributionTicker,
      perShare: new BigNumber(10),
      maxAmount: new BigNumber(500),
      paymentDate,
      declarationDate,
      expiryDate: undefined, // never expire
      description: 'A sample distribution',
      // set the default tax rate to withhold
      defaultTaxWithholding: new BigNumber(10),
      // (optional) individuals can be excluded from distributions
      targets: {
        // identities can be specified with an Identity object or DID string
        identities: [alice, '0x0200000000000000000000000000000000000000000000000000000000000000'],
        treatment: TargetTreatment.Exclude,
      },
      // (optional) individual holders can be targeted with a different rate
      taxWithholdings: [
        {
          identity: signingIdentity,
          percentage: new BigNumber(25),
        },
      ],
    });
  const distribution = await createDistributionTx.run();
  assert(createDistributionTx.isSuccess);

  // get all participants, their owed amount and whether they have been paid or not. This can be slow with a large number of holders
  const participants = await distribution.getParticipants();
  assert(participants.length > 0, 'The distribution should have at least one participant');

  // the Checkpoint can be modified before the payment date
  const modifyCheckpointTx = await distribution.modifyCheckpoint({
    checkpoint,
  });
  await modifyCheckpointTx.run();
  assert(modifyCheckpointTx.isSuccess);

  // a Corporate Action starts with no documents linked to it
  const documentsBefore = await distribution.getDocuments();
  assert(
    documentsBefore.length === 0,
    `a new Corporate Action should have no linked documents, got ${documentsBefore.length}`
  );

  /*
    Only documents already registered against the Asset can be linked to a Corporate Action,
    so they are added to the Asset first
  */
  const caDocument = {
    name: 'Distribution Terms',
    uri: 'https://example.com/distribution-terms.pdf',
    contentHash: '0x01'.padEnd(66, '0'),
    type: 'Terms',
  };

  const addDocumentsTx = await asset.documents.add({ documents: [caDocument] });
  await addDocumentsTx.run();
  assert(addDocumentsTx.isSuccess);

  const linkDocumentsTx = await distribution.linkDocuments({ documents: [caDocument] });
  await linkDocumentsTx.run();
  assert(linkDocumentsTx.isSuccess);

  const linkedDocuments = await distribution.getDocuments();
  assert(
    linkedDocuments.length === 1,
    `the Corporate Action should have one linked document, got ${linkedDocuments.length}`
  );
  assert(
    linkedDocuments[0].name === caDocument.name && linkedDocuments[0].uri === caDocument.uri,
    'the linked document should be the one added to the Asset'
  );
  assert(
    linkedDocuments[0].id instanceof BigNumber,
    'a linked document should carry its on-chain ID'
  );

  // fetch distribution details (whether funds have been reclaimed and the amount of remaining funds)
  const { remainingFunds, fundsReclaimed } = await distribution.details();
  assert(remainingFunds.gt(0), 'There should be remaining funds');
  assert(!fundsReclaimed, 'Funds should not be reclaimed yet');

  // Once the payment date has been reached these actions can be taken

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const afterPaymentDateActions = async () => {
    // claim Dividend payment for the signing Identity
    const claimTx = await distribution.claim();
    await claimTx.run();

    // push Dividend payments to specific participants
    const paymentTx = await distribution.pay({
      targets: [participants[0].identity],
    });
    await paymentTx.run();

    // reclaim remaining funds after expiry
    const reclaimTx = await distribution.reclaimFunds();
    await reclaimTx.run();
  };
};
