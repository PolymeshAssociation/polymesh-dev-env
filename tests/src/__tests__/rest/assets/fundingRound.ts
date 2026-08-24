import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams, issueAssetParams } from '~/rest/assets';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';

const handles = ['issuer'];
let factory: TestFactory;

describe('GET /assets/:asset/funding-rounds/:round/issued', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let assetId: string;

  const firstRound = 'Series A';
  const initialSupply = '10000';

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    signer = issuer.signer;

    const assetParams = createAssetParams(
      {
        options: { processMode: ProcessMode.Submit, signer },
      },
      {
        initialSupply,
        fundingRound: firstRound,
      }
    );
    assetId = await restClient.assets.createAndGetAssetId(assetParams);
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should report the initial supply against the initial funding round', async () => {
    const result = await restClient.assets.getIssuedInFundingRound(assetId, firstRound);

    expect(result).toEqual({
      fundingRound: firstRound,
      issued: initialSupply,
    });
  });

  it('should report zero for a funding round the Asset never had', async () => {
    const result = await restClient.assets.getIssuedInFundingRound(assetId, 'Never Happened');

    expect(result).toEqual({
      fundingRound: 'Never Happened',
      issued: '0',
    });
  });

  it('should accumulate further issuance into the current funding round', async () => {
    const extra = '25';

    const txData = await restClient.assets.issue(
      assetId,
      issueAssetParams(extra, {
        options: { processMode: ProcessMode.Submit, signer },
      })
    );
    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({ transactionTag: 'asset.issue' }),
      ]),
    });

    const result = await restClient.assets.getIssuedInFundingRound(assetId, firstRound);

    expect(result).toEqual({
      fundingRound: firstRound,
      issued: '10025',
    });
  });
});
