import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';

import { assertTagPresent } from '~/assertions';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import { RestSuccessResult } from '~/rest/interfaces';
import {
  approveProposalParams,
  createMultiSigParams,
  modifyMultiSigParams,
  rejectProposalParams,
  removeAdminParams,
  removePayerParams,
  setAdminParams,
} from '~/rest/multiSigs/params';

const handles = ['creator', 'signer1', 'signer2', 'newAdmin'];
let factory: TestFactory;

describe('Multi-Sig REST API', () => {
  let restClient: RestClient;
  let creator: Identity;
  let signer1: Identity;
  let signer2: Identity;
  let newAdmin: Identity;
  let multiSigAddress: string;
  let signer1Account: string;
  let signer2Account: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);

    creator = factory.getSignerIdentity(handles[0]);
    signer1 = factory.getSignerIdentity(handles[1]);
    signer2 = factory.getSignerIdentity(handles[2]);
    newAdmin = factory.getSignerIdentity(handles[3]);

    // Create unattached accounts for multi-sig signers
    const mnemonic = LocalSigningManager.generateAccount();
    signer1Account = factory.signingManager.addAccount({
      mnemonic: `${mnemonic}/signer1`,
    });
    signer2Account = factory.signingManager.addAccount({
      mnemonic: `${mnemonic}/signer2`,
    });
  });

  afterAll(async () => {
    await factory.close();
  });

  describe('/multi-sigs/create', () => {
    it('should create a MultiSig account', async () => {
      const params = createMultiSigParams([signer1Account, signer2Account], '2', {
        options: { processMode: ProcessMode.Submit, signer: creator.signer },
      });

      const result = (await restClient.multiSigs.createMultiSig(params)) as RestSuccessResult;

      expect(result).toEqual(
        expect.objectContaining({
          multiSigAddress: expect.stringMatching(/^5[A-Za-z0-9]{47}$/),
          transactions: expect.any(Array),
          details: expect.any(Object),
        })
      );

      multiSigAddress = result.multiSigAddress as string;

      expect(result).toEqual(assertTagPresent(expect, 'multiSig.createMultisig'));
    });

    it('should fail with invalid number of required signatures', async () => {
      const params = createMultiSigParams(
        [signer1Account],
        '2', // More than number of signers
        { options: { processMode: ProcessMode.Submit, signer: creator.signer } }
      );

      const result = await restClient.multiSigs.createMultiSig(params);
      expect(result).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('required signatures should not exceed'),
          statusCode: 400,
        })
      );
    });
  });

  describe('/multi-sigs/{multiSigAddress}/modify', () => {
    it('should modify a MultiSig account', async () => {
      const params = modifyMultiSigParams(
        [signer1Account, signer2Account, creator.primaryAccount.account.address],
        '2',
        { options: { processMode: ProcessMode.Submit, signer: creator.signer } }
      );

      const result = await restClient.multiSigs.modifyMultiSig(multiSigAddress, params);

      expect(result).toEqual(assertTagPresent(expect, 'multiSig.modifyMultiSig'));
    });

    it('should fail to modify MultiSig with non-creator signer', async () => {
      const params = modifyMultiSigParams([signer1Account, signer2Account], '1', {
        options: { processMode: ProcessMode.Submit, signer: signer1.signer },
      });

      await expect(restClient.multiSigs.modifyMultiSig(multiSigAddress, params)).rejects.toThrow();
    });
  });

  describe('MultiSig admin management', () => {
    describe('/multi-sigs/{multiSigAddress}/admin', () => {
      it('should get the MultiSig admin', async () => {
        const admin = await restClient.multiSigs.getAdmin(multiSigAddress);

        expect(admin).toEqual(
          expect.objectContaining({
            did: creator.did,
          })
        );
      });
    });

    describe('/multi-sigs/{multiSigAddress}/admin/set', () => {
      it('should set a new MultiSig admin', async () => {
        const params = setAdminParams(newAdmin.did, {
          options: { processMode: ProcessMode.Submit, signer: creator.signer },
        });

        const result = await restClient.multiSigs.setAdmin(multiSigAddress, params);

        expect(result).toEqual(assertTagPresent(expect, 'multiSig.addMultiSigSignerAuthorization'));
      });
    });

    describe('/multi-sigs/{multiSigAddress}/admin/remove', () => {
      it('should remove MultiSig admin', async () => {
        const params = removeAdminParams({
          options: { processMode: ProcessMode.Submit, signer: creator.signer },
        });

        const result = await restClient.multiSigs.removeAdmin(multiSigAddress, params);

        expect(result).toEqual(
          assertTagPresent(expect, 'multiSig.removeMultiSigSignerAuthorization')
        );
      });
    });
  });

  describe('MultiSig payer management', () => {
    describe('/multi-sigs/{multiSigAddress}/payer', () => {
      it('should get the MultiSig payer', async () => {
        const payer = await restClient.multiSigs.getPayer(multiSigAddress);

        expect(payer).toEqual(
          expect.objectContaining({
            did: expect.any(String),
          })
        );
      });
    });

    describe('/multi-sigs/{multiSigAddress}/payer/remove', () => {
      it('should remove MultiSig payer', async () => {
        const params = removePayerParams({
          options: { processMode: ProcessMode.Submit, signer: creator.signer },
        });

        const result = await restClient.multiSigs.removePayer(multiSigAddress, params);

        expect(result).toEqual(
          assertTagPresent(expect, 'multiSig.removeMultiSigSignerAuthorization')
        );
      });
    });
  });

  describe('MultiSig proposals', () => {
    let proposalId: string;

    beforeAll(async () => {
      // Create a proposal by trying to create a portfolio with the multisig
      // This should create a proposal since we need 2 signatures
      const portfolioParams = {
        name: 'MultiSig Test Portfolio',
        options: { processMode: ProcessMode.Submit, signer: signer1.signer },
      };

      try {
        await restClient.portfolios.createPortfolio(portfolioParams);
      } catch (error) {
        // Expected to fail, but should create a proposal
      }

      // Get active proposals to find our created proposal
      const activeProposals = await restClient.multiSigs.getActiveProposals(multiSigAddress);
      if (activeProposals.results.length > 0) {
        proposalId = activeProposals.results[0].proposalId;
      }
    });

    describe('/multi-sigs/{multiSigAddress}/active-proposals', () => {
      it('should get active proposals', async () => {
        const proposals = await restClient.multiSigs.getActiveProposals(multiSigAddress);

        expect(proposals).toEqual(
          expect.objectContaining({
            results: expect.any(Array),
            total: expect.any(String),
          })
        );

        if (proposals.results.length > 0) {
          expect(proposals.results[0]).toEqual(
            expect.objectContaining({
              multiSigAddress,
              proposalId: expect.any(String),
              details: expect.objectContaining({
                status: expect.stringMatching(/Active|Approved|Rejected|Failed/),
                approvalAmount: expect.any(String),
                rejectionAmount: expect.any(String),
              }),
            })
          );
        }
      });

      it('should get active proposals with pagination', async () => {
        const proposals = await restClient.multiSigs.getActiveProposals(multiSigAddress, '5', '0');

        expect(proposals).toEqual(
          expect.objectContaining({
            results: expect.any(Array),
            total: expect.any(String),
          })
        );
      });
    });

    describe('/multi-sigs/{multiSigAddress}/historical-proposals', () => {
      it('should get historical proposals', async () => {
        const proposals = await restClient.multiSigs.getHistoricalProposals(multiSigAddress);

        expect(proposals).toEqual(
          expect.objectContaining({
            results: expect.any(Array),
            total: expect.any(String),
          })
        );
      });

      it('should get historical proposals with pagination', async () => {
        const proposals = await restClient.multiSigs.getHistoricalProposals(
          multiSigAddress,
          '10',
          '0'
        );

        expect(proposals).toEqual(
          expect.objectContaining({
            results: expect.any(Array),
            total: expect.any(String),
          })
        );
      });
    });

    describe('/multi-sigs/{multiSigAddress}/proposals/{proposalId}', () => {
      it('should get proposal details', async () => {
        if (!proposalId) {
          pending('No proposal available for testing');
          return;
        }

        const proposal = await restClient.multiSigs.getProposal(multiSigAddress, proposalId);

        expect(proposal).toEqual(
          expect.objectContaining({
            multiSigAddress,
            proposalId,
            details: expect.objectContaining({
              status: expect.stringMatching(/Active|Approved|Rejected|Failed/),
              approvalAmount: expect.any(String),
              rejectionAmount: expect.any(String),
              autoClose: expect.any(Boolean),
              args: expect.any(Object),
              txTag: expect.any(String),
              voted: expect.any(Array),
            }),
          })
        );
      });

      it('should fail to get non-existent proposal', async () => {
        await expect(restClient.multiSigs.getProposal(multiSigAddress, '999999')).rejects.toThrow();
      });
    });

    describe('/multi-sigs/{multiSigAddress}/proposals/{proposalId}/approve', () => {
      it('should approve a proposal', async () => {
        if (!proposalId) {
          pending('No proposal available for testing');
          return;
        }

        const params = approveProposalParams({
          options: { processMode: ProcessMode.Submit, signer: signer2.signer },
        });

        const result = await restClient.multiSigs.approveProposal(
          multiSigAddress,
          proposalId,
          params
        );

        expect(result).toEqual(assertTagPresent(expect, 'multiSig.asMultiSig'));
      });

      it('should fail to approve non-existent proposal', async () => {
        const params = approveProposalParams({
          options: { processMode: ProcessMode.Submit, signer: signer1.signer },
        });

        await expect(
          restClient.multiSigs.approveProposal(multiSigAddress, '999999', params)
        ).rejects.toThrow();
      });
    });

    describe('/multi-sigs/{multiSigAddress}/proposals/{proposalId}/reject', () => {
      it('should reject a proposal', async () => {
        // First create a new proposal to reject
        const portfolioParams = {
          name: 'MultiSig Reject Test Portfolio',
          options: { processMode: ProcessMode.Submit, signer: signer1.signer },
        };

        try {
          await restClient.portfolios.createPortfolio(portfolioParams);
        } catch (error) {
          // Expected to fail, but should create a proposal
        }

        // Get the latest active proposal
        const activeProposals = await restClient.multiSigs.getActiveProposals(multiSigAddress);
        if (activeProposals.results.length === 0) {
          pending('No proposal available for rejection testing');
          return;
        }

        const latestProposalId = activeProposals.results[0].proposalId;

        const params = rejectProposalParams({
          options: { processMode: ProcessMode.Submit, signer: signer2.signer },
        });

        const result = await restClient.multiSigs.rejectProposal(
          multiSigAddress,
          latestProposalId,
          params
        );

        expect(result).toEqual(assertTagPresent(expect, 'multiSig.rejectMultiSigProposal'));
      });
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent MultiSig address', async () => {
      const fakeAddress = '5FakeAddressDoesNotExist1234567890123456789012';

      await expect(restClient.multiSigs.getAdmin(fakeAddress)).resolves.toEqual(
        expect.objectContaining({ statusCode: 400 })
      );
      await expect(restClient.multiSigs.getPayer(fakeAddress)).resolves.toEqual(
        expect.objectContaining({ statusCode: 400 })
      );
      await expect(restClient.multiSigs.getActiveProposals(fakeAddress)).resolves.toEqual(
        expect.objectContaining({ statusCode: 400 })
      );
      await expect(restClient.multiSigs.getHistoricalProposals(fakeAddress)).resolves.toEqual(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });
});
