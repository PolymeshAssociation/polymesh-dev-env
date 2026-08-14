import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { FungibleAsset } from '@polymeshassociation/polymesh-sdk/types';

import { TestFactory } from '~/helpers';
import { createAsset } from '~/sdk/assets/createAsset';
import { issueTokens } from '~/sdk/assets/issueTokens';

let factory: TestFactory;

describe('getIssuedInFundingRound', () => {
  let sdk: Polymesh;
  let asset: FungibleAsset;

  const firstRound = 'Series A';
  const secondRound = 'Series B';
  const initialSupply = new BigNumber(100);

  beforeAll(async () => {
    factory = await TestFactory.create({});
    sdk = factory.polymeshSdk;

    asset = await createAsset(sdk, {
      ticker: factory.nextTicker(),
      name: 'Funding round test',
      isDivisible: true,
      initialSupply,
      fundingRound: firstRound,
    });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should report the initial supply against the initial funding round', async () => {
    const [currentRound, issued] = await Promise.all([
      asset.currentFundingRound(),
      asset.getIssuedInFundingRound(firstRound),
    ]);

    expect(currentRound).toEqual(firstRound);
    expect(issued).toEqual(initialSupply);
  });

  it('should report zero for a funding round the Asset never had', async () => {
    const issued = await asset.getIssuedInFundingRound('Never Happened');

    expect(issued).toEqual(new BigNumber(0));
  });

  it('should accumulate further issuance into the current funding round', async () => {
    const extra = new BigNumber(25);

    await issueTokens(asset, extra);

    const issued = await asset.getIssuedInFundingRound(firstRound);

    expect(issued).toEqual(initialSupply.plus(extra));
  });

  it('should track each funding round separately', async () => {
    const modifyTx = await asset.modify({ fundingRound: secondRound });
    await modifyTx.run();

    expect(modifyTx.isSuccess).toBe(true);
    await expect(asset.currentFundingRound()).resolves.toEqual(secondRound);

    const secondRoundAmount = new BigNumber(40);
    await issueTokens(asset, secondRoundAmount);

    const [firstRoundIssued, secondRoundIssued] = await Promise.all([
      asset.getIssuedInFundingRound(firstRound),
      asset.getIssuedInFundingRound(secondRound),
    ]);

    expect(firstRoundIssued).toEqual(initialSupply.plus(25));
    expect(secondRoundIssued).toEqual(secondRoundAmount);
  });
});
