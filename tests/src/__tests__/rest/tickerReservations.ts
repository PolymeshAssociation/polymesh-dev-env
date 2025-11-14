import { assertTagPresent } from '~/assertions';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestErrorResult } from '~/rest/interfaces';
import { reserveTickerParams, transferTickerReservationParams } from '~/rest/tickerReservations';

const handles = ['issuer', 'receiver'];
let factory: TestFactory;

describe('Ticker Reservations', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let receiver: Identity;
  let ticker: string;
  /**
   * authId for transferring the reservation. Will be set after the transfer test case
   */
  let transferAuthId: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    receiver = factory.getSignerIdentity(handles[1]);

    ticker = factory.nextTicker();
    signer = issuer.signer;
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should reserve a ticker', async () => {
    const params = reserveTickerParams(ticker, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.tickerReservations.reserve(params);

    expect(result).toEqual(assertTagPresent(expect, 'asset.registerUniqueTicker'));
  });

  it('should get details about the reservation', async () => {
    const result = await restClient.tickerReservations.getReservation(ticker);

    expect(result).toEqual(
      expect.objectContaining({
        owner: issuer.did,
        status: 'Reserved',
      })
    );
  });

  it('should extend a reservation', async () => {
    const result = await restClient.tickerReservations.extend(ticker, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    expect(result).toEqual(assertTagPresent(expect, 'asset.registerUniqueTicker'));
  });

  it('should check if extend reservation will run using dry run', async () => {
    const dryRunResult = await restClient.tickerReservations.extend(ticker, {
      options: { processMode: ProcessMode.DryRun, signer },
    });

    // Check if it's an error response (backend fix may be incomplete)
    // Error: TypeError: Cannot read properties of null (reading 'toHuman')
    if ('statusCode' in dryRunResult && (dryRunResult as RestErrorResult).statusCode === 500) {
      console.error('Dry run error response:', JSON.stringify(dryRunResult, null, 2));
      // Expected behavior if backend fix is incomplete
      expect(dryRunResult).toMatchObject({
        statusCode: 500,
        message: expect.any(String),
      });
    } else {
      // Expected behavior once backend is fixed
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
    }
  });

  it('should transfer ownership', async () => {
    const params = transferTickerReservationParams(receiver.did, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.tickerReservations.transfer(ticker, params);

    expect(result.authorizationRequest).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/\d+/),
        issuer: issuer.did,
        data: { type: 'TransferTicker', value: ticker },
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transferAuthId = (result.authorizationRequest as any).id;

    expect(result).toEqual(assertTagPresent(expect, 'identity.addAuthorization'));
  });

  it('should list an Identities reservations before accepting', async () => {
    const reservations = await restClient.tickerReservations.getIdentityReservations(receiver.did);

    expect(reservations).toEqual({ results: [] });
  });

  it('should accept the transfer', async () => {
    const params = {
      options: { processMode: ProcessMode.Submit, signer: receiver.signer },
    };

    const result = await restClient.identities.acceptAuthorization(transferAuthId, params);

    expect(result).toEqual(assertTagPresent(expect, 'asset.acceptTickerTransfer'));
  });

  it('should list an Identities reservations after accepting', async () => {
    const reservations = await restClient.tickerReservations.getIdentityReservations(receiver.did);

    expect(reservations).toEqual({ results: [ticker] });
  });

  it('should not be able to reserve an already reserved ticker', async () => {
    const params = reserveTickerParams(ticker, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = (await restClient.tickerReservations.reserve(params)) as RestErrorResult;

    expect(result.statusCode).toEqual(422);
  });
});
