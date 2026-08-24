import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { VenueType } from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

import { TestFactory } from '~/helpers';

let factory: TestFactory;

/*
  Regresses a polymesh-subquery mapper bug: on chain 8.0.0 the `VenueSignersUpdated` event's
  `signers` field changed from `Vec<AccountId>` to `BTreeSet<AccountId>`. The indexer's mapper
  called `.map()` on it directly, which threw `TypeError: o.map is not a function` for a `Set`
  and permanently stalled the indexer (every subsequent block failed to process). This confirms
  the extrinsic no longer crashes the indexer and that indexing keeps advancing afterward.
*/
describe('venueSignersRegression', () => {
  let sdk: Polymesh;
  let signerAddress: string;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    signerAddress = factory.signingManager.addAccount({
      mnemonic: LocalSigningManager.generateAccount(),
    });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should add and remove a Venue signer without stalling the indexer', async () => {
    const venueTx = await sdk.settlements.createVenue({
      description: 'Signer regression venue',
      type: VenueType.Other,
    });
    const venue = await venueTx.run();
    assert(venueTx.isSuccess, 'venue creation should succeed');

    const addTx = await venue.addSigners({ signers: [signerAddress] });
    await addTx.run();
    assert(addTx.isSuccess, 'adding a Venue signer should succeed');

    const removeTx = await venue.removeSigners({ signers: [signerAddress] });
    await removeTx.run();
    assert(removeTx.isSuccess, 'removing a Venue signer should succeed');

    // if the indexer's mapper had crashed on either event above, it would have stalled
    // permanently; confirm the middleware is still advancing past the current chain height.
    const currentBlock = await sdk.network.getLatestBlock();

    const deadline = Date.now() + 60_000;
    let middlewareBlock = new BigNumber(0);
    do {
      const metadata = await sdk.network.getMiddlewareMetadata();
      assert(metadata, 'middleware metadata should be available');
      middlewareBlock = metadata.lastProcessedHeight;
      if (middlewareBlock.gte(currentBlock)) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2_000));
    } while (Date.now() < deadline);

    assert(
      middlewareBlock.gte(currentBlock),
      `the indexer should catch up to chain height ${currentBlock.toString()}, but is stuck at ${middlewareBlock.toString()}`
    );
  });
});
