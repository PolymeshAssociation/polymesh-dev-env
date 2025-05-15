import { RestSuccessResult } from "~/rest/interfaces";

export type CreatedPortfolioResult = RestSuccessResult & {
  portfolio: {
    did: string;
    id: string;
  };
};
