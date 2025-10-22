import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import {
  ClaimType,
  StatType,
  TransferRestrictionType,
} from '@polymeshassociation/polymesh-sdk/types';

import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import {
  createAssetParams,
  issueAssetParams,
  setTransferRestrictionsParams,
  setTransferRestrictionStatsParams,
} from '~/rest/assets';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestSuccessResult } from '~/rest/interfaces';
import { fungibleInstructionParams } from '~/rest/settlements';
import { awaitMiddlewareSyncedForRestApi } from '~/util';

const handles = ['issuer', 'investor', 'investor2'];
let factory: TestFactory;

describe('AssetTransferRestrictions', () => {
  let restClient: RestClient;
  let issuerSigner: string;
  let investorSigner: string;
  let investor2Signer: string;
  let issuer: Identity;
  let investor: Identity;
  let investor2: Identity;
  let assetId: string;
  const statsToEnable: Array<{
    type: StatType;
    count?: string;
    issuer?: string;
    claimType?: ClaimType;
    value?: { accredited: BigNumber; nonAccredited: BigNumber };
  }> = [];
  const restrictionCount = '2';

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    investor = factory.getSignerIdentity(handles[1]);
    investor2 = factory.getSignerIdentity(handles[2]);

    issuerSigner = issuer.signer;
    investorSigner = investor.signer;
    investor2Signer = investor2.signer;

    statsToEnable.push({
      type: StatType.Balance,
    });
    statsToEnable.push({
      type: StatType.Count,
      count: '1',
    });
    statsToEnable.push({
      type: StatType.ScopedCount,
      issuer: issuer.did,
      claimType: ClaimType.Accredited,
      value: { accredited: new BigNumber(1), nonAccredited: new BigNumber(0) },
    });
    statsToEnable.push({
      type: StatType.ScopedBalance,
      issuer: issuer.did,
      claimType: ClaimType.Affiliate,
    });

    const assetParams = createAssetParams(
      {
        options: { processMode: ProcessMode.Submit, signer: issuerSigner },
      },
      { initialSupply: '0' }
    );
    const assetCreation = (await restClient.assets.createAsset(assetParams)) as RestSuccessResult;
    assetId = assetCreation.asset as string;
    await awaitMiddlewareSyncedForRestApi(assetCreation, restClient);
    const issueTx = await restClient.assets.issue(
      assetId,
      issueAssetParams(1000, { options: { processMode: ProcessMode.Submit, signer: issuerSigner } })
    );
    await awaitMiddlewareSyncedForRestApi(issueTx, restClient);
  });

  afterAll(async () => {
    await factory.close();
  });

  const buildInstructionParams = (recipient: Identity) => {
    return fungibleInstructionParams(assetId, issuer.did, recipient.did, {
      options: { processMode: ProcessMode.Submit, signer: issuerSigner },
    });
  };

  it('should set transfer restriction stats for the Asset', async () => {
    const params = setTransferRestrictionStatsParams(
      {
        options: { processMode: ProcessMode.Submit, signer: issuerSigner },
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
  });

  it('should set count transfer restrictions for the Asset', async () => {
    const params = setTransferRestrictionsParams(
      {
        options: { processMode: ProcessMode.Submit, signer: issuerSigner },
      },
      {
        restrictions: [
          {
            type: TransferRestrictionType.Count,
            count: restrictionCount,
          },
        ],
      }
    );

    const txData = await restClient.assets.setTransferRestrictions(assetId, params);

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          type: expect.any(String),
          ...expectBasicTxInfo,
        }),
      ]),
    });
  });

  it('should get the current transfer restrictions', async () => {
    const { paused, restrictions } = (await restClient.assets.getTransferRestrictions(assetId)) as {
      paused: boolean;
      restrictions: Array<{ type: TransferRestrictionType; value: string }>;
    };

    expect(paused).toBe(false);
    expect(restrictions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: TransferRestrictionType.Count,
          value: restrictionCount,
        }),
      ])
    );

    const stats = await restClient.assets.getTransferRestrictionStats(assetId);

    expect(stats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: StatType.Count }),
        expect.objectContaining({ type: StatType.Balance }),
      ])
    );
  });

  it('should allow transfers within the count threshold', async () => {
    const instructionResult = await restClient.settlements.createDirectInstruction(
      buildInstructionParams(investor)
    );

    const { instruction } = instructionResult as RestSuccessResult & { instruction: string };

    await restClient.settlements.affirmInstruction(instruction, {
      options: { processMode: ProcessMode.Submit, signer: investorSigner },
    });

    const { results } = await restClient.assets.getAssetHolders(assetId);

    expect(results.length).toEqual(2);
  });

  it('should block transfers that violate the count restriction', async () => {
    const instructionParams = buildInstructionParams(investor2);
    const instructionResult = await restClient.settlements.createDirectInstruction(
      instructionParams
    );

    const { instruction } = instructionResult as RestSuccessResult & { instruction: string };

    await restClient.settlements.affirmInstruction(instruction, {
      options: { processMode: ProcessMode.Submit, signer: investor2Signer },
    });

    const postHolders = await restClient.assets.getAssetHolders(assetId);

    expect(postHolders.results.length).toBe(2);
  });

  it('should fetch the configured count transfer restrictions', async () => {
    const { restrictions } = (await restClient.assets.getTransferRestrictions(assetId)) as {
      restrictions: Array<{ type: TransferRestrictionType; value: string }>;
    };

    expect(restrictions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: TransferRestrictionType.Count,
        }),
      ])
    );

    const countRestriction = restrictions.find(
      ({ type }) => type === TransferRestrictionType.Count
    );

    expect(countRestriction).toBeDefined();
    if (countRestriction) {
      expect(Number(countRestriction.value)).toBeGreaterThanOrEqual(1);
    }
  });

  it('should add a percentage-based transfer restriction', async () => {
    const params = setTransferRestrictionsParams(
      {
        options: { processMode: ProcessMode.Submit, signer: issuerSigner },
      },
      {
        restrictions: [
          {
            type: TransferRestrictionType.Percentage,
            percentage: '10',
          },
        ],
      }
    );

    const txData = await restClient.assets.addTransferRestrictions(assetId, params);

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          type: expect.any(String),
          ...expectBasicTxInfo,
        }),
      ]),
    });

    const { restrictions } = (await restClient.assets.getTransferRestrictions(assetId)) as {
      restrictions: Array<{ type: TransferRestrictionType; value: string }>;
    };

    expect(restrictions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: TransferRestrictionType.Percentage,
        }),
        expect.objectContaining({
          type: TransferRestrictionType.Count,
        }),
      ])
    );
  });

  it('should remove transfer restrictions for the Asset', async () => {
    const txData = await restClient.assets.removeTransferRestrictions(assetId, {
      signer: issuerSigner,
      processMode: ProcessMode.Submit,
    });

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          type: expect.any(String),
          ...expectBasicTxInfo,
        }),
      ]),
    });
  });

  it('should allow transfers once restrictions are removed', async () => {
    const instructionParams = buildInstructionParams(investor2);
    const instructionResult = await restClient.settlements.createDirectInstruction(
      instructionParams
    );

    const { instruction } = instructionResult as RestSuccessResult & { instruction: string };

    const affirmResult = await restClient.settlements.affirmInstruction(instruction, {
      options: { processMode: ProcessMode.Submit, signer: investor2Signer },
    });

    await awaitMiddlewareSyncedForRestApi(affirmResult, restClient, new BigNumber(1));

    const { results } = await restClient.assets.getAssetHolders(assetId);

    expect(results.length).toEqual(3);
  });

  it('should enable claim count stats and restrictions', async () => {
    // Enable claim count stats
    const claimCountStats = [
      {
        type: StatType.ScopedCount,
        issuer: issuer.did,
        claimType: ClaimType.Accredited,
        value: { accredited: new BigNumber(1), nonAccredited: new BigNumber(0) },
      },
    ] as const;

    const statsParams = setTransferRestrictionStatsParams(
      {
        options: { processMode: ProcessMode.Submit, signer: issuerSigner },
      },
      { stats: claimCountStats }
    );

    const statsTxData = await restClient.assets.setTransferRestrictionStats(assetId, statsParams);

    expect(statsTxData).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          type: expect.any(String),
          ...expectBasicTxInfo,
        }),
      ]),
    });

    // Wait for middleware to sync after setting stats
    await awaitMiddlewareSyncedForRestApi(statsTxData, restClient, new BigNumber(1));

    // Set claim count transfer restrictions
    const claimCountRestrictionsParams = setTransferRestrictionsParams(
      {
        options: { processMode: ProcessMode.Submit, signer: issuerSigner },
      },
      {
        restrictions: [
          {
            type: TransferRestrictionType.ClaimCount,
            min: new BigNumber(1),
            max: new BigNumber(1),
            issuer: issuer.did,
            claim: {
              type: ClaimType.Accredited,
              accredited: true,
            },
          },
        ],
      }
    );

    // get enabled stats
    const enabledStats = await restClient.assets.getTransferRestrictionStats(assetId);
    expect(enabledStats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: StatType.ScopedCount,
        }),
      ])
    );

    const restrictionsTxData = await restClient.assets.setTransferRestrictions(
      assetId,
      claimCountRestrictionsParams
    );

    expect(restrictionsTxData).toMatchObject({
      transactions: expect.arrayContaining([
        expect.objectContaining({
          type: expect.any(String),
          ...expectBasicTxInfo,
        }),
      ]),
    });

    // Fetch current restrictions to verify claim count restriction is set
    const { restrictions } = (await restClient.assets.getTransferRestrictions(assetId)) as {
      restrictions: Array<{ type: TransferRestrictionType; value: unknown }>;
    };

    expect(restrictions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: TransferRestrictionType.ClaimCount,
        }),
      ])
    );

    const scopedCountRestriction = restrictions.find(
      ({ type }) => type === TransferRestrictionType.ClaimCount
    ) as { value: { min: string | BigNumber; max?: string | BigNumber } } | undefined;
    expect(scopedCountRestriction).toBeDefined();
    if (scopedCountRestriction) {
      const { value } = scopedCountRestriction;
      const min = new BigNumber(value.min);
      expect(min.gte(1)).toBe(true);
      if (value.max) {
        const max = new BigNumber(value.max);
        expect(max.gte(min)).toBe(true);
      }
    }
  });
});
