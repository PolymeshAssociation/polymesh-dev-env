# Polymesh Integration Tests

Integration tests for Polymesh chain services, REST APIs, and SDK workflows.

## Prerequisites

From this `tests` directory:

```sh
yarn
```

## Runtime options

Two environment modes are supported:

1. Default mode (without EVM tooling)
2. EVM tooling mode (`--profile evm`), which includes eth-rpc and Blockscout api and explorer

## Default mode workflow

```sh
yarn test:start      # starts environment with default profile set
yarn test:run        # runs integration tests
yarn test:stop       # stops and removes environment
```

Or run the full flow with one command:

```sh
yarn test
```

## EVM tooling workflow

```sh
yarn test:start:evm  # starts environment with --profile evm
yarn test:evm:smoke  # EVM RPC + Blockscout API smoke checks
yarn test:run        # optional: run integration tests while env is up
yarn test:stop:evm   # stops and removes env started with --profile evm
```

## Notes

- EVM tooling is only expected on chain v8+ presets.
