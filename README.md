A docker compose file and some auxillary scripts for running a [Polymesh](https://github.com/PolymeshAssociation) development environment via `docker compose`

## Prerequisites

Docker for you platform installed and running. Download and setup instructions can be found here: https://docs.docker.com/get-docker/

The docker daemon needs to be running before compose will work. (Try `docker ps` to see if the daemon responds)

## Running

To use, run `docker compose up` when in this directory

This will bring up:
- single node Polymesh chain in dev mode
- REST API
- subquery indexer
- subquery graphql server
- postgres (subquery dependency)

This set of services should allow for testing most integrations

`./restart.sh` is provided to help stop and start the services.

## Options

### Different Versions

Different versions of polymesh can be used by the files found in `envs/`. To use a set of 5.4 images the relevant env can be either be loaded into this directory's `.env` file (e.g. `cp envs/5.4 .env`) or be specified explicitly to `docker compose` via flag (e.g. `docker compose --env-file=envs/5.4 up`).

### Persisted vault keys

First create a docker volume to persist keys in: `docker volume create polymesh-vault-volume`. This only needs to be done once, provided the volume persists.

Then, use the `--profile=vault` when using `up` and `down`. (e.g. `docker compose --profile=vault up`). The initial vault will need to be setup and unsealed (visit `http://localhost:8200` by default). The vault data will be persisted across restarts, provided the external volume remains. This allows for stable addresses for testing purposes.

A second REST API will be brought up (listens on `:3014` by default) which is connected to the vault brought up.

This uses the Hashicorp Vault Manager: https://github.com/PolymeshAssociation/signing-managers


## Additional Notes

### Apple Silicon

When using apple silicon, polymesh images should point to the `-arm64` images. Set the appropriate prefix in the `.env` file. e.g.

`CHAIN_IMAGE=polymeshassociation/polymesh:5.4.0-staging-debian`
should become:
`CHAIN_IMAGE=polymeshassociation/polymesh-arm64:5.4.0-staging-debian`

### /mounts

The `/mounts` directory contains scripts used to setup the containers. e.g. The dev chain needs certain flags, postgres needs btree gist extensions.