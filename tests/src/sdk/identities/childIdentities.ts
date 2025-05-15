import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { ChildIdentity } from '@polymeshassociation/polymesh-sdk/internal';
import assert from 'node:assert';

/**
 * Function to add a child identity
 * @note the childAddress should already be a secondary key of the signing identity
 */
export const createChildIdentity = async (
  sdk: Polymesh,
  childAddress: string
): Promise<ChildIdentity> => {
  const identity = await sdk.getSigningIdentity();
  assert(identity);

  const secondaryAccounts = await identity.getSecondaryAccounts();
  assert(secondaryAccounts?.data.some(({ account: { address } }) => childAddress === address));

  const createChildTx = await sdk.identities.createChild({
    secondaryKey: childAddress,
  });

  const childIdentity = await createChildTx.run();

  assert(createChildTx.isSuccess);
  assert(childIdentity.did);

  return childIdentity;
};

/**
 * Function to assert that a given DID is child of the signing identity
 */
export const assertChildIdentity = async (sdk: Polymesh, childDid: string): Promise<void> => {
  const identity = await sdk.getSigningIdentity();
  assert(identity);

  const childIdentity = await sdk.identities.getChildIdentity({ did: childDid });

  const exists = await childIdentity.exists();

  assert(exists);

  const parent = await childIdentity.getParentDid();

  assert(parent?.did === identity.did);

  const children = await identity.getChildIdentities();

  assert(
    children.some(({ did }) => did === childDid),
    'childDid is not a child of the signing Identity'
  );
};

/**
 * Function to remove a child identity
 */
export const removeChildIdentity = async (sdk: Polymesh, childDid: string): Promise<void> => {
  const identity = await sdk.getSigningIdentity();
  assert(identity);

  const unlinkChildTx = await identity.unlinkChild({
    child: childDid,
  });

  await unlinkChildTx.run();

  assert(unlinkChildTx.isSuccess);
};
