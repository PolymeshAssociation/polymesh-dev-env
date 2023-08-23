#!/bin/sh

EXEC_CONTAINER=${VAULT_CONTAINER:=polymesh-vault-1}

export VAULT_ADDR='http://127.0.0.1:8200'

# unseal the vault with 1 key share
docker exec --env VAULT_ADDR=$VAULT_ADDR $EXEC_CONTAINER vault operator unseal $UNSEAL_KEY
