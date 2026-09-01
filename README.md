# Polymesh Development Environment with Docker Compose

A Docker Compose file and auxiliary scripts for running a [Polymesh](https://polymesh.network/) development environment.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose V2) installed and running. Download and setup instructions: <https://docs.docker.com/get-docker/>
- The Docker daemon must be running (`docker ps` should respond).

## Running

1. **Configuration**: Copy an environment file (e.g., `envs/8.0`) to `.env` in the project root: `cp envs/8.0 .env`. This file specifies the Docker images to use. Alternatively, provide the path directly: `docker compose --env-file=envs/8.0 up`.
2. **Start**: Run `docker compose up -d` to start the services in detached mode. This brings up the core services only; see [Runtime Modes](#runtime-modes) for the optional `rest-api` and `evm` profiles.
3. **Stop**: Run `docker compose down` to stop the services, repeating any `--profile` flags you started with — without them the profiled containers (Blockscout, eth-rpc, Vault, the REST APIs) are left running. `docker compose down --volumes` will also remove associated volumes (chain data, database data, vault data), this will reset the environment.
4. **Restart**: To apply changes (e.g., updated `.env` file), run `docker compose down && docker compose up -d`.

The `scripts/start-env.sh` and `scripts/stop-env.sh` helpers wrap these commands and manage the profile flags for you.

Full variable reference is available in `envs/template` (also linked as `.env.example`).

This setup will launch the following services by default:

- `polymesh-node`: A single Polymesh node running in development mode (`--dev`).
- `postgres`: PostgreSQL database, primarily for the Subquery indexer.
- `subquery-node`: Polymesh Subquery indexer service.
- `subquery-graphql`: GraphQL API server for querying indexed data.
- `environment-ready`: Indicates when the core services and initial setup scripts have completed successfully.

The REST API and Vault services are opt-in via the `rest-api` profile, since not
every workflow signs through them and they add five containers:

- `polymesh-rest-api-local-sm`: The Polymesh REST API service that uses local signers (Alice, Bob, Charlie, etc)
- `polymesh-rest-api-vault-sm`: The Polymesh REST API service with HashiCorp Vault as the signing manager.
- `polymesh-rest-api-vault-sm-init`: Creates test accounts and identities via the REST API.
- `vault`: HashiCorp Vault for key management.
- `vault-init`: Initializes and unseals Vault on first run, unseals on subsequent runs.

```bash
./scripts/start-env.sh --env-file envs/8.0 --profile rest-api
# or, driving compose directly
POLYMESH_WAIT_FOR_REST_API=true docker compose --env-file=envs/8.0 --profile rest-api up -d
```

`POLYMESH_WAIT_FOR_REST_API` tells `environment-ready` to wait for the REST API
account setup rather than reporting ready as soon as the core services are
healthy. `start-env.sh` sets it to match the profiles it was given, so it is
only needed when invoking `docker compose` yourself.

The integration test suite needs the REST API and Vault, so `yarn test` and
`yarn test:start` enable the profile themselves.

## Checking Environment Status

The environment involves several services starting up and performing initial setup tasks (like Vault unsealing and REST API account creation). To check when the environment is fully ready, especially on the first launch, use the `environment-ready` service logs:

```bash
docker compose logs environment-ready
```

With the `rest-api` profile enabled, wait for the message indicating completion:

```text
************************************************************************************
*** Polymesh Environment Ready! (Total initialization time: XXs)                 ***
************************************************************************************
```

If the environment was already initialized in a previous run, it will indicate readiness much faster.

Without that profile there is no account setup to wait for, so readiness is
reported as soon as the core services are healthy:

```text
************************************************************************************
*** Polymesh Environment Ready! (core services healthy) ****************************
************************************************************************************
```

## Vault VS Local Signing Manager

This environment supports usage of either the Local or Vault Signing Manager

Local signing manager uses predefined, publicly known keys (Alice, Bob, Charlie).
Vault signing manager uses the HashiCorp Vault to store the keys.

To facilitate this choice, the environment runs two independent instances of the Polymesh REST API: one configured to use local signers, and another configured to use Vault as the signing manager.

## Runtime Modes

Optional services are grouped into profiles, so a run only pays for what it
uses:

| Profile    | Adds                                                                       | Containers |
| ---------- | -------------------------------------------------------------------------- | ---------- |
| _(none)_   | node, Postgres, Subquery indexer + GraphQL, readiness check                | 5          |
| `rest-api` | both REST API instances, their init job, Vault, Vault init                 | +5         |
| `evm`      | `polymesh-eth-rpc`, Blockscout backend/frontend, Blockscout Postgres/Redis | +5         |

Profiles combine: `--profile rest-api,evm` starts everything, which is what
earlier versions of this repository did on `--profile evm` alone. If you are
only exercising smart contracts, `--profile evm` on its own leaves out Vault and
the REST APIs entirely.

Polymesh v8 includes Revive-based smart contract support, so optional EVM tooling follows Polkadot smart-contracts guidance:

- [Get started with smart contracts](https://docs.polkadot.com/smart-contracts/get-started/)
- [JSON-RPC APIs for Ethereum developers](https://docs.polkadot.com/smart-contracts/for-eth-devs/json-rpc-apis/)

### Option 1: Core mode (node and indexer only)

```bash
./scripts/start-env.sh --env-file envs/8.0
```

Add `--profile rest-api` if you need the REST API or Vault.

`--env-file` is optional; if omitted, both `start-env.sh` and `stop-env.sh`
default to `envs/latest`. You can also override the default via the
`COMPOSE_ENV` environment variable.

Stop:

```bash
./scripts/stop-env.sh --env-file envs/8.0
```

To always fetch the newest images before starting (recommended when an env
file uses floating tags such as `latest`), add `--pull always`:

```bash
./scripts/start-env.sh --env-file envs/latest --pull always
```

`--pull` accepts any Docker Compose pull policy (`always`, `missing`, `never`,
`build`); a bare `--pull` is shorthand for `always`. The same behaviour can be
set via the `COMPOSE_PULL_POLICY` environment variable.

By default `stop-env.sh` removes the named volumes (chain data, Vault keys,
Blockscout DB, ...) for a clean slate. To stop the containers but keep the data
for the next start, pass `--keep-volumes`:

```bash
./scripts/stop-env.sh --env-file envs/8.0 --keep-volumes
```

`stop-env.sh` always tears down the profiled services as well, so you do not
need to repeat `--profile evm` or `--profile rest-api` when stopping.

### Option 2: With EVM tooling

```bash
./scripts/start-env.sh --env-file envs/8.0 --profile evm
```

Stop (the EVM services are torn down automatically):

```bash
./scripts/stop-env.sh --env-file envs/8.0
```

Smoke checks:

```bash
./scripts/evm-smoke-test.sh
./scripts/blockscout-smoke-test.sh
```

Explorer URLs:

- Blockscout UI: `http://127.0.0.1:4000`
- Blockscout backend API: `http://127.0.0.1:4001`
- Blockscout API health check: `http://127.0.0.1:4001/api/v2/stats`

Notes:

- EVM tooling remains opt-in and is not started by default.
- `--profile evm` no longer pulls in Vault and the REST APIs. Blockscout and `eth-rpc` talk to the node directly, so this is the leanest way to work on contracts. Add `--profile rest-api,evm` if you want both.
- `--allow-unprotected-txs` is enabled for local experimentation with legacy transaction flows.
- Blockscout uses dedicated Postgres and Redis services, separate from Subquery services.
- If you customize ports, keep frontend `NEXT_PUBLIC_API_PORT` aligned with `POLYMESH_BLOCKSCOUT_BACKEND_PORT`.
- The upstream Blockscout frontend image enables third-party ad slots by default (a banner on the home page and a text ad on token pages). This environment disables them; set `POLYMESH_BLOCKSCOUT_AD_BANNER_PROVIDER` / `POLYMESH_BLOCKSCOUT_AD_TEXT_PROVIDER` to a provider name to re-enable.
- `envs/7.2` does not include EVM settings because chain v7.2 is not EVM-compatible.
- Treat EVM support as a v8+ feature set. Use v7.2 only for legacy non-EVM scenarios.

### Endpoints

- Substrate WS: `ws://127.0.0.1:9944`
- Substrate HTTP: `http://127.0.0.1:9933`
- Ethereum JSON-RPC: `http://127.0.0.1:8545`

### EVM Chain IDs

- Local develop runtime: `1641818`
- Testnet v8: `1641819`
- Mainnet v8: `1641820`

### MetaMask / Hardhat values (local)

- Network name: `Polymesh Dev`
- Chain ID: `1641818`
- RPC URL: `http://127.0.0.1:8545`
- Currency symbol: `POLYX`

### EVM notes and caveats

- RPC/subscription coverage can vary by image tag. Keep `POLYMESH_ETH_RPC_IMAGE` configurable in env files and pin known-good tags.
- Some paritypr image tags can be architecture-specific. Override `POLYMESH_ETH_RPC_PLATFORM` if needed.
- `eth-rpc` surfaces some native Substrate extrinsics as pseudo-Ethereum transactions: SCALE-encoded `input`, a `modl*` pallet account as `to`, and zero gas. They are visible in Blockscout but cannot be traced — `debug_traceTransaction` returns `No Ethereum extrinsic found`. Blockscout's internal transaction fetcher is therefore disabled by default (`POLYMESH_BLOCKSCOUT_DISABLE_INTERNAL_TX_FETCHER`), since it would otherwise retry those blocks indefinitely and flood the logs.
- Receipts from `eth-rpc` report the Substrate extrinsic index as `transactionIndex`, so it can disagree with the position of the hash in the block's `transactions` array.

## Additional Notes

**Vault Automation:**

- Vault, the REST APIs and the account setup below only run with `--profile rest-api`. `scripts/get-vault-token.sh` and anything reading ports 3004/3005/8200 need that profile enabled.
- The `vault-init` service automatically initializes Vault (on the very first run with the profile) and unseals it every time the services start.
- It creates one unseal key and a root token, storing them in the `vault-root-token` named volume (accessible within the `vault-init` container at `/vault-token/` as `.unseal_key` and `.token`).
- It also automatically enables the `transit` secrets engine and creates ED25519 keys named `admin`, `signer1`, `signer2`, `signer3`, and `signer4`.
- The Vault UI is available at `http://localhost:8200` (default port) for inspection.

**Using Vault with REST API & SDK:**

- The `polymesh-rest-api-vault-sm` service is automatically configured to use the Vault instance (`http://vault:8200`) and obtains the necessary root token from the shared `vault-root-token` volume. No manual `VAULT_TOKEN` environment variable is needed _for the REST API service itself_.
- The REST API uses the [HashiCorp Vault Signing Manager](https://github.com/PolymeshAssociation/signing-managers). Signer names follow the pattern `{key_name}-{key_version}`, e.g., `admin-1`, `signer1-1`.
- If you intend to use the [Polymesh SDK](https://github.com/PolymeshAssociation/polymesh-sdk) directly with this Vault instance _from your host machine or another application_, you will need the Vault address (`http://localhost:8200`) and the root token. You can retrieve the token from the running `vault-init` container (on its first/only run) or the volume if needed, but typically you'd generate a more scoped token via the Vault UI or CLI for external applications. The root token is printed by the `vault-init` service logs during setup: `docker compose logs vault-init`.

**Automated Account Setup:**

- When the REST API becomes available, the `polymesh-rest-api-vault-sm-init` service automatically:
  1. Retrieves addresses for the `admin`, `signer1`, `signer2`, `signer3`, and `signer4` keys from Vault via the REST API.
  2. Makes the `admin` key's account a CDD provider on the dev chain.
  3. Creates on-chain Identities for `signer1`, `signer2`, `signer3`, and `signer4`, funding them with initial POLYX.
- The addresses and DIDs of the signers are printed by the `polymesh-rest-api-init` logs and stored in the `rest-api-accounts-init` volume for persistence checks.

### Polymesh Portal

You can connect the [Testnet Polymesh Portal](https://portal.polymesh.live) to your local node. Go to `Settings` -> Click the `RPC URL` section in the Portal and use these settings:

- **Node RPC URL**: `ws://localhost:9944` (or your custom `POLYMESH_CHAIN_WS_PORT` if changed)
- **Middleware URL**: `http://localhost:3000` (or your custom `POLYMESH_SUBQUERY_GRAPHQL_PORT` if changed)

![Setting localhost in Polymesh Portal Settings](/imgs/portal-settings.png)
_(Image path assumes it's correctly located relative to the README)_

### Basic Examples

### Get the local signer account address

```bash
curl --silent http://localhost:3004/signer/alice -H 'accept: application/json' | jq
{
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
}
```

### Get the vault signer account address

```bash
curl --silent http://localhost:3005/signer/signer1-1 -H 'accept: application/json' | jq
{
  "address": "5Fdg1TDCX5iJarXjEsLn1gffVeddLvcQ7Jzh8gBV6W19yLxK"
}
```
