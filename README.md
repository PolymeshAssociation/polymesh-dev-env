# Polymesh Development Environment with Docker Compose

A Docker Compose file and auxiliary scripts for running a [Polymesh](https://polymesh.network/) development environment.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose V2) installed and running. Download and setup instructions: <https://docs.docker.com/get-docker/>
- The Docker daemon must be running (`docker ps` should respond).

## Running

1. **Configuration**: Copy an environment file (e.g., `envs/8.0`) to `.env` in the project root: `cp envs/8.0 .env`. This file specifies the Docker images to use. Alternatively, provide the path directly: `docker compose --env-file=envs/8.0 up`.
2. **Start**: Run `docker compose up -d` to start the services in detached mode.
3. **Stop**: Run `docker compose down` to stop the services. `docker compose down --volumes` will also remove associated volumes (chain data, database data, vault data), this will reset the environment.
4. **Restart**: To apply changes (e.g., updated `.env` file), run `docker compose down && docker compose up -d`.

Full variable reference is available in `envs/template` (also linked as `.env.example`).

This setup will launch the following services:

- `polymesh-node`: A single Polymesh node running in development mode (`--dev`).
- `postgres`: PostgreSQL database, primarily for the Subquery indexer.
- `subquery-node`: Polymesh Subquery indexer service.
- `subquery-graphql`: GraphQL API server for querying indexed data.
- `polymesh-rest-api-local-sm`: The Polymesh REST API service that uses local signers (Alice, Bob, Charlie, etc)
- `polymesh-rest-api-vault-sm`: The Polymesh REST API service with HashiCorp Vault as the signing manager.
- `polymesh-rest-api-vault-sm-init`: Creates test accounts and identities via the REST API.
- `vault`: HashiCorp Vault for key management.
- `vault-init`: Initializes and unseals Vault on first run, unseals on subsequent runs.
- `environment-ready`: Indicates when the core services and initial setup scripts have completed successfully.

## Checking Environment Status

The environment involves several services starting up and performing initial setup tasks (like Vault unsealing and REST API account creation). To check when the environment is fully ready, especially on the first launch, use the `environment-ready` service logs:

```bash
docker compose logs environment-ready
```

Wait for the message indicating completion:

```text
************************************************************************************
*** Polymesh Environment Ready! (Total initialization time: XXs)                 ***
************************************************************************************
```

If the environment was already initialized in a previous run, it will indicate readiness much faster.

## Vault VS Local Signing Manager

This environment supports usage of either the Local or Vault Signing Manager

Local signing manager uses predefined, publicly known keys (Alice, Bob, Charlie).
Vault signing manager uses the HashiCorp Vault to store the keys.

To facilitate this choice, the environment runs two independent instances of the Polymesh REST API: one configured to use local signers, and another configured to use Vault as the signing manager.

## Runtime Modes

This repository now has two runtime options:

1. Default mode (no EVM tooling)
2. EVM tooling mode (`--profile evm`), which starts `polymesh-eth-rpc`, Blockscout backend/frontend, and dedicated Blockscout Postgres/Redis.

Polymesh v8 includes Revive-based smart contract support, so optional EVM tooling follows Polkadot smart-contracts guidance:

- [Get started with smart contracts](https://docs.polkadot.com/smart-contracts/get-started/)
- [JSON-RPC APIs for Ethereum developers](https://docs.polkadot.com/smart-contracts/for-eth-devs/json-rpc-apis/)

### Option 1: Default mode (without EVM tooling)

```bash
./scripts/start-env.sh --env-file envs/8.0
```

Stop:

```bash
./scripts/stop-env.sh --env-file envs/8.0
```

### Option 2: With EVM tooling

```bash
./scripts/start-env.sh --env-file envs/8.0 --profile evm
```

Stop:

```bash
./scripts/stop-env.sh --env-file envs/8.0 --profile evm
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
- `--allow-unprotected-txs` is enabled for local experimentation with legacy transaction flows.
- Blockscout uses dedicated Postgres and Redis services, separate from Subquery services.
- If you customize ports, keep frontend `NEXT_PUBLIC_API_PORT` aligned with `POLYMESH_BLOCKSCOUT_BACKEND_PORT`.
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

## Additional Notes

**Vault Automation:**

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
