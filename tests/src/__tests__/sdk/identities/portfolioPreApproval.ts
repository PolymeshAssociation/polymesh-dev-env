import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  FungibleAsset,
  Identity,
  NumberedPortfolio,
} from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { createAsset } from '~/sdk/assets/createAsset';
import { createPortfolio } from '~/sdk/identities/portfolios';
import { randomNonce } from '~/util';

let factory: TestFactory;

describe('portfolioPreApproval', () => {
  let sdk: Polymesh;
  let asset: FungibleAsset;
  let identity: Identity;
  let portfolio: NumberedPortfolio;

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    const signingIdentity = await sdk.getSigningIdentity();
    if (!signingIdentity) {
      throw new Error('the SDK should have a signing Identity');
    }
    identity = signingIdentity;

    asset = await createAsset(sdk, { initialSupply: new BigNumber(100), isDivisible: true });
    portfolio = await createPortfolio(sdk, randomNonce(12));
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should report the asset as not pre-approved initially', async () => {
    const [portfolioApproved, identityApproved] = await Promise.all([
      portfolio.isAssetPreApproved(asset),
      identity.isAssetPreApproved(asset),
    ]);

    expect(portfolioApproved).toBe(false);
    expect(identityApproved).toBe(false);
  });

  it('should pre-approve an asset for a single Portfolio', async () => {
    const preApproveTx = await portfolio.preApproveAsset({ asset });
    await preApproveTx.run();

    expect(preApproveTx.isSuccess).toBe(true);
    await expect(portfolio.isAssetPreApproved(asset)).resolves.toBe(true);
  });

  it('should list the asset among the Portfolio pre-approved assets', async () => {
    const { data } = await portfolio.preApprovedAssets();

    expect(data.map(({ id }) => id)).toContain(asset.id);
  });

  it('should not pre-approve the asset at the Identity level', async () => {
    const [identityApproved, { data }] = await Promise.all([
      identity.isAssetPreApproved(asset),
      identity.preApprovedAssets(),
    ]);

    expect(identityApproved).toBe(false);
    expect(data.map(({ id }) => id)).not.toContain(asset.id);
  });

  it('should keep Portfolio and Identity pre-approvals independent', async () => {
    const preApproveTx = await asset.settlements.preApprove();
    await preApproveTx.run();

    expect(preApproveTx.isSuccess).toBe(true);

    const [identityApproved, portfolioApproved] = await Promise.all([
      identity.isAssetPreApproved(asset),
      portfolio.isAssetPreApproved(asset),
    ]);

    expect(identityApproved).toBe(true);
    expect(portfolioApproved).toBe(true);

    const removeIdentityApprovalTx = await asset.settlements.removePreApproval();
    await removeIdentityApprovalTx.run();

    expect(removeIdentityApprovalTx.isSuccess).toBe(true);

    await expect(identity.isAssetPreApproved(asset)).resolves.toBe(false);
    await expect(portfolio.isAssetPreApproved(asset)).resolves.toBe(true);
  });

  it('should remove the Portfolio pre-approval', async () => {
    const removeTx = await portfolio.removeAssetPreApproval({ asset });
    await removeTx.run();

    expect(removeTx.isSuccess).toBe(true);

    const [approved, { data }] = await Promise.all([
      portfolio.isAssetPreApproved(asset),
      portfolio.preApprovedAssets(),
    ]);

    expect(approved).toBe(false);
    expect(data.map(({ id }) => id)).not.toContain(asset.id);
  });
});
