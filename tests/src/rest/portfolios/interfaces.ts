import { RestSuccessResult } from '~/rest/interfaces';

export type CreatedPortfolioResult = RestSuccessResult & {
  portfolio: {
    did: string;
    id: string;
  };
};

export type PortfolioInfoResult = {
  id: string;
  name: string;
  assetBalances: {
    total: string;
    free: string;
    locked: string;
    asset: string;
  }[];
  custodian?: string;
};
