import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams } from '~/rest/assets/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestSuccessResult } from '~/rest/interfaces';
import { fungibleInstructionParams, venueParams } from '~/rest/settlements';

const handles = ['issuer', 'investor'];
let factory: TestFactory;

describe('Create and trading an Asset', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let investor: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    investor = factory.getSignerIdentity(handles[1]);

    signer = issuer.signer;

    assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should create and fetch the Asset', async () => {
    const txData = await restClient.assets.createAsset(assetParams);

    assetId = (txData as RestSuccessResult).asset as string;

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          type: 'batch',
          transactionTags: ['asset.createAsset', 'asset.issue', 'asset.addDocuments'],
          ...expectBasicTxInfo,
        },
      ]),
    });

    const asset = await restClient.assets.getAsset(assetId);
    expect(asset).toMatchObject({
      name: assetParams.name,
      assetType: assetParams.assetType,
    });
  });

  let venueId: string;
  it('should create a Venue to trade the Asset', async () => {
    const params = venueParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    const txData = await restClient.settlements.createVenue(params);

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.createVenue',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
      venue: expect.any(String),
    });

    ({ venue: venueId } = txData as { venue: string });
  });

  it('should create an instruction', async () => {
    const sender = issuer.did;
    const receiver = investor.did;
    const params = fungibleInstructionParams(assetId, sender, receiver, {
      options: { processMode: ProcessMode.Submit, signer },
    });
    const instructionData = await restClient.settlements.createInstruction(venueId, params);

    expect(instructionData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: expect.stringMatching('settlement.addAndAffirmWithMediators'),
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should affirm the created settlement', async () => {
    const result = await restClient.identities.getPendingInstructions(investor.did);

    const { results: pendingInstructions } = result;
    const pendingInstructionId = pendingInstructions[0];

    expect(pendingInstructionId).not.toBeUndefined();

    const affirmResult = await restClient.settlements.affirmInstruction(pendingInstructionId, {
      options: { processMode: ProcessMode.Submit, signer: investor.signer },
    });

    expect(affirmResult).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'settlement.affirmInstructionWithCount',
          ...expectBasicTxInfo,
        }),
      ]),
    });
  });
});
