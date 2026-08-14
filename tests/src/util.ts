import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  GenericPolymeshTransaction,
  TransactionStatus,
} from '@polymeshassociation/polymesh-sdk/types';

import { RestClient } from '~/rest';
import { PostResult, RestSuccessResult } from '~/rest/interfaces';

export const alphabet = [...Array(26)].map((val, i) => String.fromCharCode(i + 65));

export const randomNonce = (digits: number): string => {
  let output = '';
  for (let i = 0; i < digits; ++i) {
    output += Math.floor(Math.random() * 10).toString(10);
  }
  return output;
};

export const randomString = (length = 6, adjust = 0): string => {
  const timestamp = new Date().getTime();

  // Ensure that the adjustment wraps around within the range of possible hash values for the given length
  const hashValue = timestamp + (adjust % Math.pow(26, length));

  let result = '';
  let number = hashValue;

  for (let i = 0; i < length; i++) {
    // Use a rotating modulus for each character to avoid long chains of the same character
    const mod = 26 - i || 26; // Avoid modulus 0 which would cause a division by zero
    const charIndex = (number % mod) + i;

    // Wrap around if the index exceeds the alphabet length
    result = alphabet[charIndex % 26] + result;
    number = Math.floor(number / 26);
  }

  return result;
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits for the middleware to sync up to the block containing the given transaction
 *
 * @param tx - The transaction to wait for
 * @param sdk - The Polymesh SDK instance
 * @param retries - The number of times to retry checking the middleware
 * @param delay - The delay in milliseconds between retries
 * @throws {Error} If the transaction status is not Succeeded or Failed
 * @throws {Error} If the middleware has not synced after the specified number of retries
 * @returns {Promise<void>} Resolves when the middleware has synced up to the transaction's block
 */
export const awaitMiddlewareSynced = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: GenericPolymeshTransaction<any, any>,
  sdk: Polymesh,
  retries = 15,
  delay = 2000
): Promise<void> => {
  if (![TransactionStatus.Succeeded, TransactionStatus.Failed].includes(tx.status)) {
    throw new Error('Transaction was not successful or failed and does not have a block number');
  }

  const txBlock = tx.blockNumber as BigNumber;

  for (let i = 0; i < retries; i++) {
    try {
      const metadata = await sdk.network.getMiddlewareMetadata();
      const latestBlock = metadata?.lastProcessedHeight;

      if (latestBlock && latestBlock.gte(txBlock)) {
        return;
      }
    } catch (err) {
      throw new Error(`Error checking middleware sync status: ${err}`);
    }

    if (i === retries - 1) {
      throw new Error(`Middleware has not synced after ${retries} attempts`);
    }

    await sleep(delay);
  }
};

/**
 * Waits for the middleware to sync up to the block upto the block number of last transaction received from REST API
 *
 * @param result - result containing list of transactions
 * @param restClient - The Rest API Client
 * @param retries - The number of times to retry checking the middleware
 * @param delay - The delay in milliseconds between retries
 * @throws {Error} If the transaction status is not Succeeded or Failed
 * @throws {Error} If the middleware has not synced after the specified number of retries
 * @returns {Promise<void>} Resolves when the middleware has synced up to the transaction's block
 */
export const awaitMiddlewareSyncedForRestApi = async (
  result: PostResult,
  restClient: RestClient,
  bufferBlocks = new BigNumber(0),
  retries = 15,
  delay = 6000
): Promise<void> => {
  if (!('transactions' in result)) {
    throw new Error('Transaction was not successful or failed');
  }

  const { transactions } = result;

  const txBlock = transactions[transactions.length - 1].blockNumber;

  for (let i = 0; i < retries; i++) {
    try {
      const metadata = await restClient.network.getMiddlewareMetadata();
      const latestBlock = (metadata as { lastProcessedHeight: string })?.lastProcessedHeight;

      if (latestBlock && new BigNumber(latestBlock).gte(new BigNumber(txBlock))) {
        if (new BigNumber(latestBlock).gte(new BigNumber(txBlock).plus(bufferBlocks)) || i === 5) {
          // this is a hacky way to get middleware to wait on syncing instruction execution event for SettleOnAffirmation type instruction
          return;
        }
      }
    } catch (err) {
      throw new Error(`Error checking middleware sync status: ${err}`);
    }

    if (i === retries - 1) {
      throw new Error(`Middleware has not synced after ${retries} attempts`);
    }

    await sleep(delay);
  }
};

/**
 * Returns a date in the future by the given number of days
 * @param days - The number of days to add to the current date
 * @returns The date in the future
 */
export const getDayInFuture = (days: number): Date =>
  new Date(Date.now() + 1000 * 60 * 60 * 24 * days);

export const isRestError = (
  result: unknown
): result is { statusCode: number; message?: string | string[] } =>
  typeof result === 'object' && result !== null && 'statusCode' in result;

export const getInstructionId = (result: PostResult): string | undefined =>
  (result as RestSuccessResult).instruction as string | undefined;

export const isAlreadyAffirmedError = (result: unknown): boolean =>
  isRestError(result) && String(result.message).toLowerCase().includes('already affirmed');

export const isInstructionPurgedError = (result: unknown): boolean =>
  isRestError(result) &&
  result.statusCode === 500 &&
  (String(result.message).toLowerCase().includes('purged') ||
    String(result.message).toLowerCase().includes('internal server error'));

export type VenueInstructionResult = {
  result: PostResult;
  instructionId?: string;
  autoSettled: boolean;
};

/**
 * Create a venue instruction. On v8 exchange venues the instruction may auto-settle and be
 * purged before the API returns (500). Callers should check `autoSettled` and skip affirm flows.
 */
export const createVenueInstruction = async (
  restClient: RestClient,
  polymeshSdk: Polymesh,
  venueId: string,
  params: Record<string, unknown>,
  { keepPending = false }: { keepPending?: boolean } = {}
): Promise<VenueInstructionResult> => {
  const createParams = keepPending
    ? await withPendingInstructionBlock(restClient, polymeshSdk, params)
    : params;

  const result = await restClient.settlements.createInstruction(
    venueId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createParams as any
  );

  if (isInstructionPurgedError(result)) {
    return { result, autoSettled: true };
  }

  return {
    result,
    instructionId: getInstructionId(result),
    autoSettled: false,
  };
};

export const createDirectInstruction = async (
  restClient: RestClient,
  polymeshSdk: Polymesh,
  params: Record<string, unknown>,
  { keepPending = false }: { keepPending?: boolean } = {}
): Promise<VenueInstructionResult> => {
  const createParams = keepPending
    ? await withPendingInstructionBlock(restClient, polymeshSdk, params)
    : params;

  const result = await restClient.settlements.createDirectInstruction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createParams as any
  );

  if (isInstructionPurgedError(result)) {
    return { result, autoSettled: true };
  }

  return {
    result,
    instructionId: getInstructionId(result),
    autoSettled: false,
  };
};

/**
 * Venue instructions without an end block can auto-execute and be purged
 * before the API returns. Tests that need a pending instruction should pass this.
 */
export const withPendingInstructionBlock = async <T extends Record<string, unknown>>(
  restClient: RestClient,
  polymeshSdk: Polymesh,
  params: T,
  blocksAhead = 50
): Promise<T & { endAfterBlock?: string }> => {
  const endAfterBlock = await getPendingInstructionEndBlock(polymeshSdk, restClient, blocksAhead);

  return {
    ...params,
    endAfterBlock: endAfterBlock.toString(),
  };
};

/**
 * Instructions without an end block can auto-settle immediately.
 * SDK settlement helpers should pass this as `endBlock` / `endAfterBlock`.
 */
export const getPendingInstructionEndBlock = async (
  polymeshSdk: Polymesh,
  restClient?: RestClient,
  blocksAhead = 50
): Promise<BigNumber> => {
  if (restClient) {
    const latestBlock = await restClient.network.getLatestBlock();
    return new BigNumber(Number(latestBlock.id) + blocksAhead);
  }

  const blockNumber = await polymeshSdk.network.getLatestBlock();
  return blockNumber.plus(blocksAhead);
};
