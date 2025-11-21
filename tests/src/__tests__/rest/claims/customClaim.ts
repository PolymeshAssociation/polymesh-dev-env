import { ClaimType } from '@polymeshassociation/polymesh-sdk/types';

import { expectBasicTxInfo } from '~/__tests__/rest/utils';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { createClaimParams, registerCustomClaimTypeParams } from '~/rest/claims/params';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';

const handles = ['issuer', 'target'];
let factory: TestFactory;

describe('CustomClaim', () => {
  let restClient: RestClient;
  let signer: string;
  let issuer: Identity;
  let target: Identity;
  let targetDid: string;
  let issuerDid: string;
  let claimParams: ReturnType<typeof createClaimParams>;
  let txHash: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    issuer = factory.getSignerIdentity(handles[0]);
    target = factory.getSignerIdentity(handles[1]);

    signer = issuer.signer;
    targetDid = target.did;
    issuerDid = issuer.did;

    claimParams = createClaimParams({
      options: { signer, processMode: ProcessMode.Submit },
      claims: [
        {
          target: targetDid,
          claim: {
            type: ClaimType.Custom,
            scope: {
              type: 'Identity',
              value: issuerDid,
            },
            customClaimTypeId: 1,
          },
        },
      ],
    });

    const params = registerCustomClaimTypeParams(factory.nextTicker(), {
      options: { signer, processMode: ProcessMode.Submit },
    });
    const txData = await restClient.claims.registerCustomClaimType(params);

    txHash = txData.transactions[0].transactionHash;

    await restClient.pingForTransaction(txHash, 10);
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should add a custom claim', async () => {
    const result = await restClient.claims.addClaim(claimParams);

    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'identity.addClaim',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });

  it('should add a custom claim', async () => {
    const result = await restClient.claims.removeClaim(claimParams);

    expect(result).toMatchObject({
      transactions: expect.arrayContaining([
        {
          transactionTag: 'identity.revokeClaim',
          type: 'single',
          ...expectBasicTxInfo,
        },
      ]),
    });
  });
});
