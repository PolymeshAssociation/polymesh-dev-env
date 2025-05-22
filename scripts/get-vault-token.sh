#!/bin/sh

# This script extracts the Vault root token from the polymesh-vault-init container logs and writes it to std out

VAULT_TOKEN=$(docker logs polymesh-vault-init-1 --tail=10 |
  grep "Vault Root Token:" | tail -n 1 | cut -d' ' -f4)

echo $VAULT_TOKEN
