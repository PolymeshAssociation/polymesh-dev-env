import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createAssetParams } from '~/rest/assets';
import { createCheckpointParams, createScheduleParams } from '~/rest/checkpoints/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestSuccessResult } from '~/rest/interfaces';
import { fungibleInstructionParams } from '~/rest/settlements/params';

import { expectBasicTxInfo } from '../utils';

const handles = ['issuer', 'holder1', 'holder2'];
let factory: TestFactory;

describe('Checkpoints Controller', () => {
  let restClient: RestClient;
  let issuer: Identity;
  let signer: string;
  let holder1: Identity;
  let holder2: Identity;
  let assetId: string;
  let checkpointId: string;
  let scheduleId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    signer = issuer.signer;
    holder1 = factory.getSignerIdentity(handles[1]);
    holder2 = factory.getSignerIdentity(handles[2]);
  });

  afterAll(async () => {
    await factory.close();
  });

  describe('Checkpoint Management', () => {
    it('complete the pre-requisites', async () => {
      // Create an asset with initial supply
      const assetParams = createAssetParams(
        {
          options: { processMode: ProcessMode.Submit, signer },
        },
        {
          name: 'Test Checkpoint Asset',
          initialSupply: '100',
        }
      );

      assetId = await restClient.assets.createAndGetAssetId(assetParams);

      expect(assetId).toBeDefined();

      // Transfer tokens to holder1 (so multiple DIDs hold the asset)
      const transferToHolder1Tx = await restClient.settlements.createDirectInstruction(
        fungibleInstructionParams(assetId, issuer.did, holder1.did, {
          options: { processMode: ProcessMode.Submit, signer },
        })
      );

      // should have created an instruction
      expect((transferToHolder1Tx as RestSuccessResult).instruction).toBeDefined();

      // Use the correct property for the instruction ID (assuming it's 'id' from the API response)
      await restClient.settlements.affirmInstruction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (transferToHolder1Tx as any).instruction,
        {
          options: { processMode: ProcessMode.Submit, signer: holder1.signer },
        }
      );

      // Transfer tokens to holder2
      const transferToHolder2Tx = await restClient.settlements.createDirectInstruction(
        fungibleInstructionParams(assetId, issuer.did, holder2.did, {
          options: { processMode: ProcessMode.Submit, signer },
        })
      );

      // should have created an instruction
      expect((transferToHolder2Tx as RestSuccessResult).instruction).toBeDefined();

      const txData2 = (await restClient.settlements.affirmInstruction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (transferToHolder2Tx as any).instruction,
        {
          options: { processMode: ProcessMode.Submit, signer: holder2.signer },
        }
      )) as RestSuccessResult;

      expect(txData2).toMatchObject({
        transactions: expect.arrayContaining([
          {
            transactionTag: 'settlement.affirmInstructionWithCount',
            type: 'single',
            ...expectBasicTxInfo,
          },
        ]),
      });

      await restClient.pingForTransaction(txData2.transactions[0].transactionHash, 10);

      const { results: holder1Assets } = await restClient.identities.getHeldAssets(holder1.did);
      expect(holder1Assets).toBeDefined();
      expect(holder1Assets).toContain(assetId);

      const { results: holder2Assets } = await restClient.identities.getHeldAssets(holder2.did);
      expect(holder2Assets).toBeDefined();
      expect(holder2Assets).toContain(assetId);
    });

    it('should create a checkpoint', async () => {
      // Create a checkpoint
      const createCheckpointTx = (await restClient.checkpoints.createCheckpoint(
        assetId,
        createCheckpointParams({
          options: { processMode: ProcessMode.Submit, signer },
        })
      )) as RestSuccessResult;

      expect(createCheckpointTx).toMatchObject({
        transactions: expect.arrayContaining([
          {
            transactionTag: 'checkpoint.createCheckpoint',
            type: 'single',
            ...expectBasicTxInfo,
          },
        ]),
      });
      expect(createCheckpointTx.checkpoint).toBeDefined();
      expect((createCheckpointTx.checkpoint as RestSuccessResult).id).toBeDefined();

      checkpointId = (createCheckpointTx.checkpoint as RestSuccessResult).id as string;
    });

    it('should fetch checkpoint by ID and get details', async () => {
      // Fetch checkpoint by ID
      const checkpoint = await restClient.checkpoints.getCheckpoint(assetId, checkpointId);
      expect(checkpoint).toBeDefined();
      expect(checkpoint).toMatchObject({
        id: checkpointId,
        createdAt: expect.any(String),
        totalSupply: expect.any(String),
      });
    });

    it('should get checkpoint balances', async () => {
      const { results: checkpointBalances } = await restClient.checkpoints.getCheckpointBalances(
        assetId,
        checkpointId
      );
      expect(checkpointBalances).toBeDefined();
      expect(checkpointBalances.length).toBe(3);

      // Check that the array contains checkpoint balances for each identity
      expect(checkpointBalances).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            identity: issuer.did,
            balance: expect.any(String),
          }),
          expect.objectContaining({
            identity: holder1.did,
            balance: expect.any(String),
          }),
          expect.objectContaining({
            identity: holder2.did,
            balance: expect.any(String),
          }),
        ])
      );
    });

    it('should get all checkpoints for the asset', async () => {
      // Get all checkpoints
      const checkpoints = await restClient.checkpoints.getCheckpoints(assetId);
      expect(checkpoints).toMatchObject({
        results: expect.arrayContaining([
          expect.objectContaining({
            id: checkpointId,
            totalSupply: expect.any(String),
            createdAt: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe('Checkpoint Schedule Management', () => {
    it('should create a checkpoint schedule', async () => {
      // Create a checkpoint schedule
      const createScheduleTx = (await restClient.checkpoints.createSchedule(
        assetId,
        createScheduleParams({
          options: { processMode: ProcessMode.Submit, signer },
        })
      )) as RestSuccessResult;

      expect(createScheduleTx).toMatchObject({
        transactions: expect.arrayContaining([
          {
            transactionTag: 'checkpoint.createSchedule',
            type: 'single',
            ...expectBasicTxInfo,
          },
        ]),
      });
      expect(createScheduleTx.schedule).toMatchObject(
        expect.objectContaining({
          id: expect.any(String),
          asset: assetId,
          expiryDate: expect.any(String),
          pendingPoints: expect.arrayContaining([expect.any(String)]),
          remainingCheckpoints: expect.any(String),
          nextCheckpointDate: expect.any(String),
        })
      );

      scheduleId = (createScheduleTx.schedule as RestSuccessResult).id as string;
    });

    it('should check if create checkpoint schedule will run using dry run', async () => {
      const dryRunResult = await restClient.checkpoints.createSchedule(
        assetId,
        createScheduleParams({
          options: { processMode: ProcessMode.DryRun, signer },
        })
      );

      // Dry run response includes empty transactions array and details with fees/status
      // Note: resolver doesn't run in dry run mode, so fields like 'schedule' are not populated
      expect(dryRunResult).toMatchObject({
        transactions: [],
        details: {
          status: expect.any(String),
          fees: {
            protocol: expect.any(String),
            gas: expect.any(String),
            total: expect.any(String),
          },
          supportsSubsidy: expect.any(Boolean),
          payingAccount: {
            balance: expect.any(String),
            type: expect.any(String),
            address: expect.any(String),
          },
        },
      });
    });

    it('should fetch schedule by ID and get details', async () => {
      // Get schedule details which should include next checkpoint date
      const schedule = await restClient.checkpoints.getSchedule(assetId, scheduleId);
      expect(schedule).toBeDefined();
      expect(schedule as RestSuccessResult).toHaveProperty('id', scheduleId);
      expect(schedule as RestSuccessResult).toHaveProperty('asset', assetId);
      expect(schedule as RestSuccessResult).toHaveProperty('expiryDate');
      expect(schedule as RestSuccessResult).toHaveProperty('nextCheckpointDate');
      expect(schedule as RestSuccessResult).toHaveProperty('pendingPoints');
      expect(Array.isArray((schedule as RestSuccessResult).pendingPoints)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((schedule as any).pendingPoints.length).toBeGreaterThan(0);
      expect(schedule as RestSuccessResult).toHaveProperty('remainingCheckpoints');
      expect(typeof (schedule as RestSuccessResult).remainingCheckpoints).toBe('string');
    });

    it('should get all schedules for the asset', async () => {
      // Get all schedules
      const { results } = await restClient.checkpoints.getSchedules(assetId);
      expect(results).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            id: scheduleId,
            asset: assetId,
            expiryDate: expect.any(String),
            nextCheckpointDate: expect.any(String),
            pendingPoints: expect.arrayContaining([expect.any(String)]),
            remainingCheckpoints: expect.any(String),
          }),
        ])
      );
    });

    it('should get checkpoints originated by a schedule', async () => {
      // Get checkpoints originated by the schedule
      const scheduleCheckpoints = await restClient.checkpoints.getScheduleCheckpoints(
        assetId,
        scheduleId
      );
      expect(scheduleCheckpoints).toBeDefined();
      // Initially there should be no checkpoints from the schedule since they haven't been triggered yet
      expect(Array.isArray(scheduleCheckpoints)).toBe(true);
    });

    it('should get checkpoint complexity for the asset', async () => {
      // Get checkpoint complexity
      const complexity = await restClient.checkpoints.getComplexity(assetId);
      expect(complexity).toBeDefined();
      expect(complexity).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            currentComplexity: expect.any(String),
            maxComplexity: expect.any(String),
            id: scheduleId,
          }),
        ])
      );
    });

    it('should get schedule complexity for the asset', async () => {
      // Get schedule complexity
      const complexity = await restClient.checkpoints.getScheduleComplexity(assetId, scheduleId);
      expect(complexity).toBeDefined();
      expect(complexity).toMatchObject(
        expect.objectContaining({
          complexity: '3',
        })
      );
    });

    it('should delete a schedule', async () => {
      // Delete the schedule
      const deleteScheduleTx = await restClient.checkpoints.deleteSchedule(assetId, scheduleId, {
        options: { processMode: ProcessMode.Submit, signer },
      });
      expect(deleteScheduleTx).toBeDefined();
      expect(deleteScheduleTx).toMatchObject({
        transactions: expect.arrayContaining([
          {
            transactionTag: 'checkpoint.removeSchedule',
            type: 'single',
            ...expectBasicTxInfo,
          },
        ]),
      });
    });
  });
});
