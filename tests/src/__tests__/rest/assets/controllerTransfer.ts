import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { controllerTransferParams, createAssetParams } from '~/rest/assets/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestSuccessResult } from '~/rest/interfaces';
import { fungibleInstructionParams } from '~/rest/settlements/params';

import { expectBasicTxInfo } from '../utils';

const handles = ['issuer', 'holder'];
let factory: TestFactory;

describe('Fungible AssetController transfer', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let holder: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    holder = factory.getSignerIdentity(handles[1]);

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

  it('should transfer the asset to holder', async () => {
    const transferToHolderTx = await restClient.settlements.createDirectInstruction(
      fungibleInstructionParams(assetId, issuer.did, holder.did, {
        options: { processMode: ProcessMode.Submit, signer },
      })
    );

    // should have created an instruction
    expect((transferToHolderTx as RestSuccessResult).instruction).toBeDefined();

    const txData = await restClient.settlements.affirmInstruction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (transferToHolderTx as any).instruction,
      {
        options: { processMode: ProcessMode.Submit, signer: holder.signer },
      }
    );

    expect(txData).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.affirmInstructionWithCount',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });

    const { results } = await restClient.assets.getAssetHolders(assetId);

    expect(results.length).toEqual(2);
    expect(results).toContainEqual(
      expect.objectContaining({
        identity: issuer.did,
        balance: '99990',
      })
    );
    expect(results).toContainEqual(
      expect.objectContaining({
        identity: holder.did,
        balance: '10',
      })
    );
  });

  it('should run controller transfer and return the asset back to the issuer', async () => {
    const controllerTransferTx = (await restClient.assets.controllerTransfer(
      assetId,
      controllerTransferParams({ did: holder.did, id: '0' }, 10, {
        options: { processMode: ProcessMode.Submit, signer },
      })
    )) as RestSuccessResult;

    expect(controllerTransferTx).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'asset.controllerTransfer',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });

    const { results } = await restClient.assets.getAssetHolders(assetId);

    expect(results.length).toBeGreaterThan(1);
    expect(results).toEqual(
      expect.arrayContaining([
        {
          identity: issuer.did,
          balance: '100000',
        },
      ])
    );
  });
});
