A docker compose file and some auxillary scripts for running a [Polymesh](https://polymesh.network/) development environment via `docker compose`

## Prerequisites

Docker for you platform installed and running. Download and setup instructions can be found here: <https://docs.docker.com/get-docker/>

The docker daemon needs to be running before compose will work. (Try `docker ps` to see if the daemon responds)

## Running

Copy the correct env over to a `.env` from `envs/` e.g. `cp envs/7.0 .env`. This file specifies the images that will be used. Alternatively a file patch can be given explicitly to docker compose, e.g. `docker compose --env-file=envs/7.0 up`

Once an `.env` file is present use `docker compose up -d` to bring up the services. `docker compose down` will stop them.

This will bring up:

- single node Polymesh chain in dev mode
- REST API
- subquery indexer
- subquery graphql server
- postgres (subquery dependency)

This set of services should allow for testing most integrations

Update your `.env` file and use `./restart.sh` to restart the services with different versions

## Options

### Persisted Vault Keys

First create a docker volume to persist keys in: `docker volume create polymesh-vault-volume`. This only needs to be done once, provided the volume persists.

Then, use the `--profile=vault` when using `up` and `down`. (e.g. `docker compose --profile=vault up`).

The initial Vault will need to be setup and unsealed (visit `http://localhost:8200` by default). The Vault data will be persisted across restarts, provided the external volume remains. This allows for stable addresses for testing purposes.

Within Vault you must enable the Transit Secrets Engine. Signing keys are created and stored within it. Signing keys must be type ED25519.

To utilize the REST API with Vault, ensure that the Vault is unsealed and provide the `VAULT_TOKEN` environmental variable. This is necessary for establishing a connection between the REST API and the Vault. As the token can only be created during or after initialization of the Vault you will need stop the service (`docker compose --profile=vault down`), set the env variable and restart the service before you can use it to sign data.

The REST API uses the [Hashicorp Vault Signing Manager](https://github.com/PolymeshAssociation/signing-managers). With the Vault services running you can also use the signing manger in conjunction with the [Polymesh SDK](https://github.com/PolymeshAssociation/polymesh-sdk)

## Additional Notes

### Apple Silicon

When using apple silicon, polymesh images should point to the `-arm64` images. Set the appropriate prefix in the `.env` file. e.g.

`CHAIN_IMAGE=polymeshassociation/polymesh:7.0.0-testnet-debian`
should become:
`CHAIN_IMAGE=polymeshassociation/polymesh-arm64:7.0.0-testnet-debian`

As a work around, I use this shell snippet to select dynamically in scripts:

```sh
ARCHITECTURE=$(uname -m)
CHAIN_REPO=polymeshassociation/polymesh
if [ "$ARCHITECTURE" = "arm64" ]; then
    CHAIN_REPO="polymeshassociation/polymesh-arm64"
fi
```

### Polymesh Portal

You can set a custom RPC point on the [Testnet Polymesh Portal](https://portal.polymesh.live/settings) to use the locally running node. By default the settings you will need are:

```
RPC URL: ws://localhost:9944
Middleware URL: http://localhost:3001
```

![setting localhost in polymesh portal settings](/imgs/portal-settings.png)

### /mounts

The `/mounts` directory contains scripts used to setup the containers. e.g. The dev chain needs certain flags, postgres needs btree gist extensions.
