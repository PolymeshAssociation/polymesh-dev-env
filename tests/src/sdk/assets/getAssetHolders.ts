import {
  FungibleAsset,
  IdentityBalance,
  PaginationOptions,
  ResultSet,
} from '@polymeshassociation/polymesh-sdk/types';

/**
 * This function demonstrates getting an Asset's holders from its ticker
 */
export const getAssetHolders = async (
  asset: FungibleAsset,
  paginationOpts?: PaginationOptions
): Promise<ResultSet<IdentityBalance>> => {
  return asset.assetHolders.get(paginationOpts);
};
