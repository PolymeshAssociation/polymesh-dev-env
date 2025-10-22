import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import {
  allowVenuesParams,
  createAssetParams,
  disallowVenuesParams,
  venueFilteringParams,
} from '~/rest/assets/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestSuccessResult } from '~/rest/interfaces';
import { venueParams } from '~/rest/settlements';

import { expectBasicTxInfo } from '../utils';

const handles = ['issuer'];
let factory: TestFactory;

describe('Asset Venue Filtering', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let assetParams: ReturnType<typeof createAssetParams>;
  let assetId: string;
  let venueId1: string;
  let venueId2: string;

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

  it('should create an asset', async () => {
    assetId = await restClient.assets.createAndGetAssetId(assetParams);

    const asset = await restClient.assets.getAsset(assetId);

    expect(asset).toMatchObject({
      name: assetParams.name,
      assetType: assetParams.assetType,
    });
  });

  it('should create venues for testing', async () => {
    // Create first venue
    const venue1Params = venueParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    const venue1Result = await restClient.settlements.createVenue(venue1Params);
    venueId1 = (venue1Result as RestSuccessResult).venue as string;

    expect(venue1Result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.createVenue',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
      venue: expect.any(String),
    });

    // Create second venue
    const venue2Params = venueParams({
      options: { processMode: ProcessMode.Submit, signer },
    });
    const venue2Result = await restClient.settlements.createVenue(venue2Params);
    venueId2 = (venue2Result as RestSuccessResult).venue as string;

    expect(venue2Result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.createVenue',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
      venue: expect.any(String),
    });
  });

  it('should get initial venue filtering details (disabled by default)', async () => {
    const details = await restClient.assets.getVenueFilteringDetails(assetId);

    expect(details).toMatchObject({
      isEnabled: false,
      allowedVenues: [],
      disallowedVenues: [],
    });
  });

  it('should enable venue filtering', async () => {
    const params = venueFilteringParams({
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.assets.enableVenueFiltering(assetId, params);

    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.setVenueFiltering',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should verify venue filtering is enabled', async () => {
    const details = await restClient.assets.getVenueFilteringDetails(assetId);

    expect(details).toMatchObject({
      isEnabled: true,
      allowedVenues: [],
      disallowedVenues: [],
    });
  });

  it('should allow specific venues', async () => {
    const params = allowVenuesParams([parseInt(venueId1), parseInt(venueId2)], {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.assets.allowVenues(assetId, params);

    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.allowVenues',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should verify venues are allowed', async () => {
    const details = await restClient.assets.getVenueFilteringDetails(assetId);

    expect(details).toMatchObject({
      isEnabled: true,
      allowedVenues: expect.arrayContaining([venueId1, venueId2]),
      disallowedVenues: [],
    });

    expect(details.allowedVenues).toHaveLength(2);
  });

  it('should disallow a specific venue', async () => {
    const params = disallowVenuesParams([parseInt(venueId2)], {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.assets.disallowVenues(assetId, params);

    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.disallowVenues',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should verify venue is disallowed', async () => {
    const details = await restClient.assets.getVenueFilteringDetails(assetId);

    expect(details).toMatchObject({
      isEnabled: true,
      allowedVenues: expect.arrayContaining([venueId1]),
      disallowedVenues: [],
    });

    expect(details.allowedVenues).toHaveLength(1);
    expect(details.disallowedVenues).toHaveLength(0);
  });

  it('should disable venue filtering', async () => {
    const params = venueFilteringParams({
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.assets.disableVenueFiltering(assetId, params);

    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'settlement.setVenueFiltering',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should verify venue filtering is disabled', async () => {
    const details = await restClient.assets.getVenueFilteringDetails(assetId);

    expect(details).toMatchObject({
      isEnabled: false,
      allowedVenues: expect.any(Array),
      disallowedVenues: [],
    });
  });

  it('should handle multiple venue operations', async () => {
    // Re-enable venue filtering
    await restClient.assets.enableVenueFiltering(assetId, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    // Allow both venues again
    await restClient.assets.allowVenues(assetId, {
      venues: [parseInt(venueId1), parseInt(venueId2)],
      options: { processMode: ProcessMode.Submit, signer },
    });

    const details = await restClient.assets.getVenueFilteringDetails(assetId);

    expect(details.isEnabled).toBe(true);
    expect(details.allowedVenues).toHaveLength(2);
    expect(details.disallowedVenues).toHaveLength(0);
  });
});
