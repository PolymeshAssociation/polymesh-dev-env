import { assertTagPresent } from '~/assertions';
import { TestFactory } from '~/helpers';
import { RestClient } from '~/rest';
import { ProcessMode } from '~/rest/common';
import { Identity } from '~/rest/identities/interfaces';
import {
  acceptSubsidyParams,
  createSubsidyParams,
  quitSubsidyParams,
  setSubsidyAllowanceParams,
} from '~/rest/subsidy';

const handles = ['subsidizer', 'beneficiary'];
let factory: TestFactory;

describe('Subsidy', () => {
  const setAllowanceAmount = 777;

  let restClient: RestClient;
  let signer: string;
  let subsidizer: Identity;
  let subsidizerAddress: string;
  let beneficiary: Identity;
  let beneficiaryAddress: string;

  beforeAll(async () => {
    factory = await TestFactory.create({ handles });
    ({ restClient } = factory);
    subsidizer = factory.getSignerIdentity(handles[0]);
    subsidizerAddress = subsidizer.primaryAccount.account.address;
    beneficiary = factory.getSignerIdentity(handles[1]);
    beneficiaryAddress = beneficiary.primaryAccount.account.address;

    signer = subsidizer.signer;
  });

  afterAll(async () => {
    await factory.close();
  });

  it('should approve a subsidy for an account', async () => {
    const params = createSubsidyParams(beneficiaryAddress, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.subsidy.approveSubsidy(params);

    expect(result).toEqual(assertTagPresent(expect, 'relayer.approveSubsidy'));
  });

  it('should accept a subsidy', async () => {
    const params = acceptSubsidyParams(subsidizerAddress, {
      options: { processMode: ProcessMode.Submit, signer: beneficiary.signer },
    });

    const result = await restClient.subsidy.acceptSubsidy(params);

    expect(result).toEqual(assertTagPresent(expect, 'relayer.acceptSubsidy'));
  });

  it('should set subsidy allowance', async () => {
    const params = setSubsidyAllowanceParams(beneficiaryAddress, setAllowanceAmount, {
      options: { processMode: ProcessMode.Submit, signer },
    });

    const result = await restClient.subsidy.setSubsidyAllowance(params);

    expect(result).toEqual(assertTagPresent(expect, 'relayer.updatePolyxLimit'));
  });

  it('should get subsidy information', async () => {
    const subsidy = await restClient.subsidy.getSubsidy(subsidizerAddress, beneficiaryAddress);

    expect(subsidy).toEqual(
      expect.objectContaining({
        allowance: setAllowanceAmount.toString(),
        beneficiary: {
          address: beneficiaryAddress,
          signerType: 'Account',
        },
        subsidizer: {
          address: subsidizerAddress,
          signerType: 'Account',
        },
      })
    );
  });

  it('should quit a subsidy', async () => {
    const params = quitSubsidyParams(subsidizerAddress, {
      options: { processMode: ProcessMode.Submit, signer: beneficiary.signer },
    });

    const result = await restClient.subsidy.quitSubsidy(params);

    expect(result).toEqual(assertTagPresent(expect, 'relayer.removeSubsidy'));
  });
});
