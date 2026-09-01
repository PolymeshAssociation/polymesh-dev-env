# Polymesh Integration Tests

Integration tests for Polymesh chain services, REST APIs, and SDK workflows.

## Prerequisites

From this `tests` directory:

```sh
yarn
```

## Runtime options

Optional services are grouped into compose profiles:

- `rest-api` adds both REST API instances and Vault. The suite signs with Vault
  and drives the REST API, so the test scripts enable this profile themselves.
- `evm` adds eth-rpc and the Blockscout API and explorer.

## Default mode workflow

```sh
yarn test:start      # starts environment with --profile rest-api
yarn test:run        # runs integration tests
yarn test:stop       # stops environment, keeping volumes
yarn test:stop:clean # stops and also removes named volumes (clean slate)
```

Or run the full flow with one command:

```sh
yarn test
```

## EVM tooling workflow

```sh
yarn test:start:evm  # starts environment with --profile rest-api,evm
yarn test:evm:smoke  # EVM RPC + Blockscout API smoke checks
yarn test:run        # optional: run integration tests while env is up
yarn test:stop       # stops the environment, whichever profiles it used
```

## Notes

- `test:stop` leaves the named volumes in place so the next start resumes from
  the existing state; `test:stop:clean` removes them. Calling `stop-env.sh`
  directly, the flag is `--volumes` (or `-v`).
- EVM tooling is only expected on chain v8+ presets.
- The suite requires a **chain v8 preset** (`envs/8.0`, `envs/latest`). The Polymesh SDK dropped v7
  support in v31 and throws on connecting to a v7 node, so `envs/7.2` can no longer be used here.
