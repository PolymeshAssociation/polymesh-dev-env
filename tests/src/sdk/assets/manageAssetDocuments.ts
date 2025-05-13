import { blake2AsHex } from '@polkadot/util-crypto';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/types';
import assert from 'assert';

/*
  This function showcases adding and removing documents from an FungibleAsset. It:
    - Sets 2 documents to the FungibleAsset
    - Fetches the details of the documents
    - Removes a document from the FungibleAsset
*/
export const manageAssetDocuments = async (sdk: Polymesh, asset: FungibleAsset): Promise<void> => {
  const doc1 = {
    name: 'Document One',
    uri: 'https://example.com/one',
    contentHash: blake2AsHex('Example 1'),
  };
  const doc2 = {
    name: 'Document Two',
    uri: 'https://example.com/two',
    contentHash: blake2AsHex('Example 2'),
  };
  const documents = [doc1, doc2];

  // Prepare and execute a set documents transaction
  let setDocumentsTx = await asset.documents.set({ documents });
  await setDocumentsTx.run();
  assert(setDocumentsTx.isSuccess);

  // Note - the result is paginated in case there are many documents
  const addedDocs = await asset.documents.get();
  assert(
    documents.length === addedDocs.data.length,
    'The documents should be the same length as the params'
  );

  // Remove a document by calling `.set` without including it
  setDocumentsTx = await asset.documents.set({ documents: [doc2] });
  await setDocumentsTx.run();
  assert(setDocumentsTx.isSuccess);

  const updatedDocs = await asset.documents.get();
  assert(
    updatedDocs.data.length - addedDocs.data.length === 1,
    'A document should have been removed'
  );
};
