import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { createNftCollectionParams, issueNftParams } from '~/rest/nfts';
import { nftInstructionParams, venueParams } from '~/rest/settlements';
import { awaitMiddlewareSyncedForRestApi } from '~/util';

const handles = ['issuer', 'collector'];
let factory: TestFactory;

describe('Create and trading an NFT', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let collector: Identity;
  let nftParams: ReturnType<typeof createNftCollectionParams>;
  let assetId: string;
  let instructionId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    collector = factory.getSignerIdentity(handles[1]);

    signer = issuer.signer;

    nftParams = createNftCollectionParams(
      [{ type: 'Local', name: 'Test', spec: { description: 'test metadata' } }],
      { options: { processMode: ProcessMode.Submit, signer } }
    );

    assetId = await restClient.nfts.createAndGetNftCollection(nftParams);

    const params = issueNftParams(assetId, [{ type: 'Local', id: '1', value: 'test value' }], {
      options: { processMode: ProcessMode.Submit, signer },
    });

    await restClient.nfts.issueNft(assetId, params);
  });

  afterAll(async () => {
    await factory.close();
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

  it('should allow NFT instruction to be created', async () => {
    const sender = issuer.did;
    const receiver = collector.did;
    const params = nftInstructionParams(assetId, sender, receiver, ['1'], {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.settlements.createInstruction(venueId, params);
    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          transactionTag: 'settlement.addAndAffirmWithMediators',
          ...expectBasicTxInfo,
        }),
      ]),
    });

    await awaitMiddlewareSyncedForRestApi(result, restClient);
  });

  it('should allow instruction with NFT leg to be viewed', async () => {
    const pendingResult = await restClient.identities.getPendingInstructions(collector.did);

    const { results: pendingInstructions } = pendingResult;
    instructionId = pendingInstructions[0];

    expect(instructionId).toBeDefined();

    const result = await restClient.settlements.getInstruction(instructionId);

    expect(result).toMatchObject({
      legs: expect.arrayContaining([
        expect.objectContaining({
          asset: assetId,
          nfts: expect.arrayContaining(['1']),
        }),
      ]),
    });
  });

  it('should allow to get affirmations', async () => {
    const result = await restClient.settlements.getAffirmations(instructionId);

    expect(result).toMatchObject({
      results: expect.arrayContaining([
        expect.objectContaining({
          identity: issuer.did,
          status: 'Affirmed',
        }),
      ]),
    });
  });

  it('should allow affirmation to be withdrawn', async () => {
    const result = await restClient.settlements.withdrawAffirmation(instructionId, {
      options: { processMode: ProcessMode.Submit, signer: issuer.signer },
    });
    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          ...expectBasicTxInfo,
          transactionTag: 'settlement.withdrawAffirmationWithCount',
        }),
      ]),
    });
  });

  it('should allow instruction to be affirmed by collector', async () => {
    const result = await restClient.settlements.affirmInstruction(instructionId, {
      options: { processMode: ProcessMode.Submit, signer: collector.signer },
    });
    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          ...expectBasicTxInfo,
          transactionTag: 'settlement.affirmInstructionWithCount',
        }),
      ]),
    });
  });

  it('should allow instruction to be rejected', async () => {
    const result = await restClient.settlements.rejectInstruction(instructionId, {
      options: { processMode: ProcessMode.Submit, signer: collector.signer },
    });
    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          ...expectBasicTxInfo,
          transactionTag: 'settlement.rejectInstructionWithCount',
        }),
      ]),
    });
  });
});
