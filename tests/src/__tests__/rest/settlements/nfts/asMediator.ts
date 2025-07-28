import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { createNftCollectionParams, issueNftParams } from '~/rest/nfts';
import { nftInstructionParams, venueParams } from '~/rest/settlements';

const handles = ['issuer', 'investor', 'mediator'];
let factory: TestFactory;

describe('Trading an NFT with mediators', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let investor: Identity;
  let mediator: Identity;
  let venueId: string;
  let nftParams: ReturnType<typeof createNftCollectionParams>;
  let collectionId: string;
  let instructionId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    investor = factory.getSignerIdentity(handles[1]);
    mediator = factory.getSignerIdentity(handles[2]);

    signer = issuer.signer;

    nftParams = createNftCollectionParams(
      [{ type: 'Local', name: 'Test', spec: { description: 'test metadata' } }],
      { options: { processMode: ProcessMode.Submit, signer } }
    );

    collectionId = await restClient.nfts.createAndGetNftCollection(nftParams);

    const params = issueNftParams(collectionId, [{ type: 'Local', id: '1', value: 'test value' }], {
      options: { processMode: ProcessMode.Submit, signer },
    });
    await restClient.nfts.issueNft(collectionId, params);
    const txData = await restClient.settlements.createVenue(
      venueParams({
        options: { processMode: ProcessMode.Submit, signer },
      })
    );

    ({ venue: venueId } = txData as { venue: string });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should create an instruction', async () => {
    const sender = issuer.did;
    const receiver = investor.did;
    const params = nftInstructionParams(
      collectionId,
      sender,
      receiver,
      ['1'],
      {
        options: { processMode: ProcessMode.Submit, signer },
      },
      { mediators: [mediator.did] }
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
