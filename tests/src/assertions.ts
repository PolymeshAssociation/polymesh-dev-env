export const assertTagPresent = (expect: jest.Expect, tag: string): jest.Expect => {
  return expect.objectContaining({
    transactions: expect.arrayContaining([
      expect.objectContaining({
        transactionTag: tag,
      }),
    ]),
  });
};
