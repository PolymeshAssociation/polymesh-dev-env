import { AuthorizationType, SignerType } from '@polymeshassociation/polymesh-sdk/types';

import { assertTagPresent } from '~/assertions';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestErrorResult } from '~/rest/interfaces';
import { portfolioParams, setCustodianParams } from '~/rest/portfolios';
import { randomNonce } from '~/util';

const handles = ['issuer', 'custodian'];
let factory: TestFactory;

describe('Portfolios Controller', () => {
  let restClient: RestClient;
  let portfolioCount = 1;
  let signer: string;
  let issuer: Identity;
  let custodian: Identity;
  let portfolioId: string;
  const nonce = randomNonce(12);

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    custodian = factory.getSignerIdentity(handles[1]);
    signer = issuer.signer;
  });

  afterAll(async () => {
    await factory.close();
  });

  describe('method: getPortfolios', () => {
    it('should get all the portfolios of an Identity', async () => {
      const result = await restClient.portfolios.getPortfolios(issuer.did);

      expect(result).toEqual(
        expect.objectContaining({
          results: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              assetBalances: expect.any(Array),
              owner: expect.any(String),
            }),
          ]),
        })
      );

      // We expect at least the default portfolio to be present
      expect(result.results.length).toEqual(portfolioCount);
    });
  });

  describe('method: createPortfolio', () => {
    it('should create a portfolio', async () => {
      const params = portfolioParams(`TEST-${nonce}`, {
        options: { processMode: ProcessMode.Submit, signer },
      });

      const result = await restClient.portfolios.createPortfolio(params);

      // Ensure the result of createPortfolio matches the expected structure
      expect(result).toEqual(
        expect.objectContaining({
          portfolio: expect.objectContaining({
            id: expect.any(String),
            did: expect.stringMatching(issuer.did),
          }),
        })
      );
      expect(result).toEqual(assertTagPresent(expect, 'portfolio.createPortfolio'));

      // Extract the portfolio ID from the result
      portfolioId = result.portfolio.id;
      portfolioCount += 1;

      // Retrieve all portfolios and verify the count and presence of the new portfolio
      const portfolios = await restClient.portfolios.getPortfolios(issuer.did);
      expect(portfolios.results.length).toEqual(portfolioCount);

      // Check if the newly created portfolio is present in the results
      const newPortfolio = portfolios.results.find((portfolio) => portfolio.id === portfolioId);
      expect(newPortfolio).toEqual(
        expect.objectContaining({
          id: portfolioId,
          name: expect.stringMatching(/^TEST-/),
          assetBalances: expect.any(Array),
          owner: expect.any(String),
        })
      );
    });

    it('should check if create portfolio will run using dry run', async () => {
      const params = portfolioParams(`TEST-DRYRUN-${nonce}`, {
        options: { processMode: ProcessMode.DryRun, signer },
      });

      const dryRunResult = await restClient.portfolios.createPortfolio(params);

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
  });

  describe('method: deletePortfolio', () => {
    it('should delete a portfolio', async () => {
      const params = portfolioParams(`DELETE-${nonce}`, {
        options: { processMode: ProcessMode.Submit, signer },
      });

      const { portfolio } = await restClient.portfolios.createPortfolio(params);
      portfolioCount += 1;

      const result = await restClient.portfolios.deletePortfolio(issuer.did, portfolio.id, params);

      expect(result).toEqual(assertTagPresent(expect, 'portfolio.deletePortfolio'));

      portfolioCount -= 1;
    });
  });

  describe('method: modifyPortfolioName', () => {
    it('should rename a portfolio', async () => {
      const params = portfolioParams(`RENAME-${nonce}`, {
        options: { processMode: ProcessMode.Submit, signer },
      });

      const result = await restClient.portfolios.modifyPortfolioName(
        issuer.did,
        portfolioId,
        params
      );

      expect(result).toEqual(assertTagPresent(expect, 'portfolio.renamePortfolio'));
    });

    it('should return error when renaming to same name', async () => {
      const params = portfolioParams(`RENAME-${nonce}`, {
        options: { processMode: ProcessMode.Submit, signer },
      });

      const result = (await restClient.portfolios.modifyPortfolioName(
        issuer.did,
        portfolioId,
        params
      )) as RestErrorResult;

      expect(result.statusCode).toEqual(400);
    });

    it('should return error when renaming default portfolio', async () => {
      const params = portfolioParams(`RENAME-${nonce}`, {
        options: { processMode: ProcessMode.Submit, signer },
      });

      const result = (await restClient.portfolios.modifyPortfolioName(
        issuer.did,
        '0',
        params
      )) as RestErrorResult;

      expect(result.statusCode).toEqual(400);
    });

    it('should return error when renaming not existing portfolio', async () => {
      const params = portfolioParams(`RENAME-${nonce}`, {
        options: { processMode: ProcessMode.Submit, signer },
      });

      const result = (await restClient.portfolios.modifyPortfolioName(
        issuer.did,
        (portfolioCount + 777).toString(),
        params
      )) as RestErrorResult;

      expect(result.statusCode).toEqual(404);
    });
  });

  describe('method: getPortfolio', () => {
    it('should get a portfolio', async () => {
      const result = await restClient.portfolios.getPortfolio(issuer.did, portfolioId);

      expect(result).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/.*/),
          name: expect.stringMatching(`RENAME-${nonce}`),
          assetBalances: [],
          owner: issuer.did,
        })
      );
    });
  });

  describe('method: setCustodian', () => {
    let authId: string;

    it('should transfer custody', async () => {
      const params = setCustodianParams(
        {
          target: custodian.did,
        },
        {
          options: { processMode: ProcessMode.Submit, signer },
        }
      );
      const result = await restClient.portfolios.setCustodian(issuer.did, portfolioId, params);

      expect(result).toEqual(assertTagPresent(expect, 'identity.addAuthorization'));
    });

    it('should have created an authorization request', async () => {
      const result = await restClient.identities.getPendingAuthorizations(
        custodian.did,
        AuthorizationType.PortfolioCustody
      );

      expect(result.received[0]).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/.*/),
          expiry: null,
          data: expect.objectContaining({
            type: AuthorizationType.PortfolioCustody,
            value: expect.objectContaining({
              did: issuer.did,
              id: portfolioId,
            }),
          }),
          issuer: issuer.did,
          target: expect.objectContaining({
            did: custodian.did,
            signerType: SignerType.Identity,
          }),
        })
      );

      authId = result.received[0].id;
    });

    it('should accept a custody request', async () => {
      const params = {
        options: { processMode: ProcessMode.Submit, signer: custodian.signer },
      };

      const result = await restClient.identities.acceptAuthorization(authId, params);

      expect(result).toEqual(assertTagPresent(expect, 'portfolio.acceptPortfolioCustody'));
    });
  });

  describe('method: getCustodiedPortfolios', () => {
    it('get the portfolio should be custodied by the custodian', async () => {
      const result = await restClient.portfolios.getPortfolio(issuer.did, portfolioId);

      expect(result.custodian).toEqual(custodian.did);
    });

    it('should get all portfolios custodied by the custodian and assert the current portfolio exists', async () => {
      const result = await restClient.portfolios.getCustodiedPortfolios(custodian.did);

      expect(result).toEqual(
        expect.objectContaining({
          results: expect.arrayContaining([
            expect.objectContaining({ id: portfolioId, did: issuer.did }),
          ]),
        })
      );
    });
  });

  describe('method: getTransactionHistory', () => {
    it('should get transaction history for the specified portfolio', async () => {
      const result = await restClient.portfolios.getTransactionHistory(issuer.did, portfolioId);

      expect(result).toEqual(
        expect.objectContaining({
          results: expect.any(Array),
        })
      );
    });

    it('should throw an error for not existing portfolio', async () => {
      const result = (await restClient.portfolios.getTransactionHistory(
        issuer.did,
        portfolioCount.toString()
      )) as unknown as RestErrorResult;

      expect(result.statusCode).toEqual(404);
    });
  });

  describe('method: quitCustody', () => {
    it('should quit custody via custodian', async () => {
      const result = await restClient.portfolios.quitCustody(issuer.did, portfolioId, {
        options: {
          processMode: ProcessMode.Submit,
          signer: custodian.signer,
        },
      });

      expect(result).toEqual(assertTagPresent(expect, 'portfolio.quitPortfolioCustody'));
    });

    it('should throw an error if portfolio owner tries to quit custody', async () => {
      const result = (await restClient.portfolios.quitCustody(issuer.did, portfolioId, {
        options: { processMode: ProcessMode.Submit, signer },
      })) as unknown as RestErrorResult;

      expect(result.statusCode).toEqual(422);
    });

    it('should throw an error', async () => {
      const result = (await restClient.portfolios.quitCustody(issuer.did, portfolioId, {
        options: {
          processMode: ProcessMode.Submit,
          signer: custodian.signer,
        },
      })) as unknown as RestErrorResult;

      expect(result.statusCode).toEqual(401);
    });

    it('should throw an error', async () => {
      const result = (await restClient.portfolios.quitCustody(
        issuer.did,
        (portfolioCount + 777).toString(),
        {
          options: {
            processMode: ProcessMode.Submit,
            signer: custodian.signer,
          },
        }
      )) as unknown as RestErrorResult;

      expect(result.statusCode).toEqual(404);
    });

    it('the portfolio should be custodied by the original owner', async () => {
      const result = await restClient.portfolios.getPortfolio(issuer.did, portfolioId);

      expect(result.custodian).toBeUndefined();
    });
  });

  describe('method: createdAt', () => {
    it('should return the creation event', async () => {
      const result = await restClient.portfolios.createdAt(issuer.did, portfolioId);

      expect(result).toEqual(
        expect.objectContaining({
          blockDate: expect.any(String),
          blockHash: expect.any(String),
          blockNumber: expect.any(String),
          eventIndex: expect.any(String),
        })
      );
    });

    it('should throw an error for not existing portfolio', async () => {
      const result = await restClient.portfolios.createdAt(
        issuer.did,
        (portfolioCount + 777).toString()
      );

      expect(result.statusCode).toEqual(404);
    });
  });
});
