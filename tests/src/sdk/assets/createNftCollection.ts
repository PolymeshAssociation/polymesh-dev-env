import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { NftCollection } from '@polymeshassociation/polymesh-sdk/internal';
import {
  CollectionKeyInput,
  CreateNftCollectionParams,
  KnownNftType,
  ProcedureOpts,
} from '@polymeshassociation/polymesh-sdk/types';
import assert from 'node:assert';

export const createNftCollection = async (
  sdk: Polymesh,
  args: Partial<CreateNftCollectionParams>,
  opts?: ProcedureOpts
): Promise<NftCollection> => {
  const requiredParams = {
    ticker: 'NFT',
    nftType: KnownNftType.Derivative,
    collectionKeys: [] as CollectionKeyInput[],
  } as const;

  const params = {
    ...requiredParams,
    ...args,
  };

  // Validates arguments (e.g. ticker is not taken) and returns a Transaction to be ran.
  const createCollectionTx = await sdk.assets.createNftCollection(params, opts);

  // The `NftCollection` entity will be returned after the transaction is finalized
  const collection = await createCollectionTx.run();
  assert(createCollectionTx.isSuccess);

  return collection;
};
