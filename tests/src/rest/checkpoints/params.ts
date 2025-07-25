import { TxBase, TxExtras } from "~/rest/common";
import { getDayInFuture } from "~/util";


const defaultScheduleParams = {
    points: [
        getDayInFuture(30),
        getDayInFuture(60),
        getDayInFuture(90),
    ],
  };

export const createCheckpointParams = (base: TxBase, extras: TxExtras = {}) =>
    ({
    ...extras,
    ...base,
  } as const);

  export const createScheduleParams = (base: TxBase, extras: TxExtras = {}) =>
    ({
    ...defaultScheduleParams,
    ...extras,
    ...base,
  } as const);

  type ModifyDistributionCheckpointParams = {
    checkpoint: Date | { type: 'Existing' | 'Schedule', id: string }
  }

  export const modifyDistributionCheckpointParams = (base: TxBase, extras: ModifyDistributionCheckpointParams) =>
    ({
    ...extras,
    ...base,
  } as const);