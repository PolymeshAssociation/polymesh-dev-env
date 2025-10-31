import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams, setTransferRestrictionStatsParams } from '~/rest/assets';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';

const handles = ['issuer'];
let factory: TestFactory;

describe('AssetTransferRestrictionStats', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;
  const statsToEnable = [
    {
      type: 'Balance',
    },
  ];

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);

    signer = issuer.signer;

    assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    assetId = await restClient.assets.createAndGetAssetId(assetParams);
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should set transfer restriction stats for the Asset', async () => {
    const params = setTransferRestrictionStatsParams(
      {
        options: { processMode: ProcessMode.Submit, signer },
      },
      { stats: statsToEnable }
    );

    const txData = await restClient.assets.setTransferRestrictionStats(assetId, params);

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          type: expect.any(String),
          ...expectBasicTxInfo,
        }),
      ]),
    });
  });

  it('should fetch the enabled transfer restriction stats for the Asset', async () => {
    const stats = await restClient.assets.getTransferRestrictionStats(assetId);

    expect(stats).toHaveLength(statsToEnable.length);
    expect(stats).toEqual(
      expect.arrayContaining(statsToEnable.map((stat) => expect.objectContaining(stat)))
    );
  });
});
