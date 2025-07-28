import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams } from '~/rest/assets/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { fungibleInstructionParams, venueParams } from '~/rest/settlements';

const handles = ['issuer', 'investor', 'mediator'];
let factory: TestFactory;

describe('Create and trading an Asset with mediators', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let investor: Identity;
  let mediator: Identity;
  let venueId: string;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;
  let instructionId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    investor = factory.getSignerIdentity(handles[1]);
    mediator = factory.getSignerIdentity(handles[2]);

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
  });

  it('should create a Venue to trade the Asset', async () => {
    const params = venueParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    const txData = await restClient.settlements.createVenue(params);

    ({ venue: venueId } = txData as { venue: string });
  });

  it('should create an instruction', async () => {
    const sender = issuer.did;
    const receiver = investor.did;
    const params = fungibleInstructionParams(
      assetId,
      sender,
      receiver,
      {
        options: { processMode: ProcessMode.Submit, signer },
      },
      {
        mediators: [mediator.did],
      }
    );
    const instructionData = await restClient.settlements.createInstruction(venueId, params);

    expect(instructionData).toMatchObject({
      instruction: expect.any(String),
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.addAndAffirmWithMediators',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });

    instructionId = (instructionData as unknown as { instruction: string }).instruction;
  });

  it('should allow the mediator to affirm the instruction', async () => {
    const affirmResult = await restClient.settlements.affirmInstructionAsMediator(
      instructionId,
      new Date('2055/01/01'),
      {
        options: { processMode: ProcessMode.Submit, signer: mediator.signer },
      }
    );

    expect(affirmResult).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'settlement.affirmInstructionAsMediator',
          ...expectBasicTxInfo,
        }),
      ]),
    });
  });

  it('should allow the mediator to withdraw affirmation', async () => {
    const withdrawResult = await restClient.settlements.withdrawAsMediator(instructionId, {
      options: { processMode: ProcessMode.Submit, signer: mediator.signer },
    });

    expect(withdrawResult).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'settlement.withdrawAffirmationAsMediator',
          ...expectBasicTxInfo,
        }),
      ]),
    });
  });

  it('should allow the mediator to reject the instruction', async () => {
    const affirmResult = await restClient.settlements.rejectAsMediator(instructionId, {
      options: { processMode: ProcessMode.Submit, signer: mediator.signer },
    });

    expect(affirmResult).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'settlement.rejectInstructionAsMediator',
          ...expectBasicTxInfo,
        }),
      ]),
    });
  });
});
