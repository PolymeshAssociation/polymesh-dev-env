import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { assertTagPresent } from '~/assertions';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import {
  abdicateAgentParams,
  assignAgentToGroupParams,
  checkAgentPermissionsParams,
  createAssetParams,
  createPermissionGroupParams,
  inviteAgentToGroupParams,
  modifyPermissionGroupParams,
  removeAgentFromGroupParams,
} from '~/rest/assets/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';

const handles = ['issuer', 'agent'];
let factory: TestFactory;

describe('Asset Permission Groups', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let agent: Identity;
  let agentSigner: string;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;
  let permissionGroupId: string;
  let authorizationRequestId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);

    issuer = factory.getSignerIdentity(handles[0]);
    signer = issuer.signer;
    agent = factory.getSignerIdentity(handles[1]);
    agentSigner = agent.signer;

    assetParams = createAssetParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should create an asset', async () => {
    assetId = await restClient.assets.createAndGetAssetId(assetParams);

    const asset = await restClient.assets.getAsset(assetId);

    expect(asset).toMatchObject({
      name: assetParams.name,
      assetType: assetParams.assetType,
    });
  });

  it('should create a permission group', async () => {
    const permissionGroupParams = createPermissionGroupParams({
      options: { processMode: ProcessMode.Submit, signer },
    });

    const permissionGroup = await restClient.assets.createPermissionGroup(
      assetId,
      permissionGroupParams
    );

    permissionGroupId = permissionGroup.id;

    expect(permissionGroup).toMatchObject({
      id: expect.any(String),
    });
  });

  it('should list the permission groups', async () => {
    const permissionGroups = await restClient.assets.getPermissionGroups(assetId);

    expect(permissionGroups).toMatchObject({
      results: expect.arrayContaining([expect.objectContaining({ id: permissionGroupId })]),
    });
  });

  it('should return the custom permission group permissions', async () => {
    const permissionGroup = await restClient.assets.getPermissionGroup(assetId, permissionGroupId);

    expect(permissionGroup).toMatchObject({
      id: permissionGroupId,
      permissions: expect.objectContaining({
        transactionGroups: expect.arrayContaining(['CapitalDistribution']),
      }),
    });
  });

  it('should invite agent to the permission group', async () => {
    const params = inviteAgentToGroupParams(agent.did, permissionGroupId, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const inviteAgentToGroup = await restClient.assets.inviteAgentToGroup(assetId, params);

    expect(inviteAgentToGroup).toMatchObject({
      authorizationRequest: expect.objectContaining({
        id: expect.any(String),
      }),
      transactions: expect.arrayContaining([
        expect.objectContaining({
          ...expectBasicTxInfo,
        }),
      ]),
    });
    expect(inviteAgentToGroup).toEqual(assertTagPresent(expect, 'identity.addAuthorization'));

    authorizationRequestId = inviteAgentToGroup.authorizationRequest.id;
  });

  it('agent should accept the invitation', async () => {
    const params = {
      options: { processMode: ProcessMode.Submit, signer: agent.signer },
    };

    const result = await restClient.identities.acceptAuthorization(authorizationRequestId, params);

    expect(result).toEqual(assertTagPresent(expect, 'externalAgents.acceptBecomeAgent'));
  });

  it('should set a different permission group for the agent', async () => {
    const params = assignAgentToGroupParams(agent.did, 'Full', {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.assets.assignAgentToGroup(assetId, params);

    expect(result).toMatchObject({
      transactions: expect.arrayContaining([expect.objectContaining({ ...expectBasicTxInfo })]),
    });
  });

  it('should remove the agent from asset', async () => {
    const params = removeAgentFromGroupParams(agent.did, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.assets.removeAgentFromGroup(assetId, params);

    expect(result).toEqual(assertTagPresent(expect, 'externalAgents.removeAgent'));
  });

  it('should add the agent back to the asset', async () => {
    const params = inviteAgentToGroupParams(agent.did, permissionGroupId, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.assets.inviteAgentToGroup(assetId, params);

    expect(result).toEqual(assertTagPresent(expect, 'identity.addAuthorization'));

    const acceptParams = {
      options: { processMode: ProcessMode.Submit, signer: agentSigner },
    };

    const acceptResult = await restClient.identities.acceptAuthorization(
      result.authorizationRequest.id,
      acceptParams
    );

    expect(acceptResult).toEqual(assertTagPresent(expect, 'externalAgents.acceptBecomeAgent'));
  });

  it('should check the agent permissions', async () => {
    const params = checkAgentPermissionsParams(agent.did, ['externalAgents.removeAgent']);

    const result = await restClient.assets.checkPermissions(assetId, params);

    expect(result).toMatchObject({
      result: expect.any(Boolean),
    });
  });

  it('should modify the custom permission group permissions', async () => {
    const params = modifyPermissionGroupParams(
      {
        options: { processMode: ProcessMode.Submit, signer },
      },
      {
        transactionGroups: ['AssetManagement'],
      }
    );

    const result = await restClient.assets.setPermissionGroup(assetId, permissionGroupId, params);

    expect(result).toMatchObject({
      transactions: expect.arrayContaining([expect.objectContaining({ ...expectBasicTxInfo })]),
    });
  });

  it('should allow agent to abdicate from the asset', async () => {
    const params = abdicateAgentParams(agent.did, {
      options: { processMode: ProcessMode.Submit, signer: agentSigner },
    });

    const result = await restClient.assets.abdicateAgent(assetId, params);

    expect(result).toEqual(assertTagPresent(expect, 'externalAgents.abdicate'));
  });
});
