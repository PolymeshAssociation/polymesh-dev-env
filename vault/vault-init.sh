#! /bin/sh

set -e

export VAULT_ADDR=http://vault:8200

# give some time for Vault to start and be ready
sleep 3

# login with root token at $VAULT_ADDR
vault login root

# enable vault transit engine
vault secrets enable transit