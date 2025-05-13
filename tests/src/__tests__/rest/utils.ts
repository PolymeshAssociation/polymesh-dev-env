/**
 * helper to assert basic transaction identifiers are present in a response
 */
export const expectBasicTxInfo = {
  blockNumber: expect.any(String),
  blockHash: expect.stringContaining('0x'),
  transactionHash: expect.stringContaining('0x'),
};
