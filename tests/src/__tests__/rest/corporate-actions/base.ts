import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import { TargetTreatment } from '@polymeshassociation/polymesh-sdk/types';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams } from '~/rest/assets/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';

const handles = ['issuer', 'recipient'];
let factory: TestFactory;

describe('Corporate Actions', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);

    signer = issuer.signer;

    assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should create and fetch the Asset', async () => {
    assetId = await restClient.assets.createAndGetAssetId(assetParams);

    const asset = await restClient.assets.getAsset(assetId);

    expect(asset).toMatchObject({
      name: assetParams.name,
      assetType: assetParams.assetType,
    });

    await restClient.compliance.pauseRequirements(assetId, {
      options: { processMode: ProcessMode.Submit, signer },
    });
  });

  it('should get the corporate actions default config', async () => {
    const result = await restClient.corporateActions.getCorporateActionsDefaultConfig(assetId);

    expect(result).toEqual(
      expect.objectContaining({
        targets: {
          identities: [],
          treatment: TargetTreatment.Exclude,
        },
        defaultTaxWithholding: '0',
        taxWithholdings: [],
      })
    );
  });

  it('should modify the corporate actions default config', async () => {
    await restClient.corporateActions.modifyCorporateActionsDefaultConfig(assetId, {
      options: { processMode: ProcessMode.Submit, signer },
      defaultTaxWithholding: new BigNumber(100),
      targets: undefined,
      taxWithholdings: undefined,
    });

    const result = await restClient.corporateActions.getCorporateActionsDefaultConfig(assetId);

    expect(result).toEqual(
      expect.objectContaining({
        targets: {
          identities: [],
          treatment: TargetTreatment.Exclude,
        },
        defaultTaxWithholding: '100',
        taxWithholdings: [],
      })
    );
  });
});
