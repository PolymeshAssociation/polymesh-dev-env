const prefixedDidLength = 66; // 64 bytes + 2 for `0x`

export const wellKnown = {
  alice: {
    did: '0x01'.padEnd(prefixedDidLength, '0'),
    mnemonic: '//Alice',
  },
} as const;

export enum AMQPTopics {
  Finalizations = 'Finalizations',
}
