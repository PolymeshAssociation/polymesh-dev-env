#!/bin/sh

# This script extracts the Vault root token from the polymesh-vault-init container logs
# and exports it as VAULT_TOKEN environment variable. It also prints the token to stdout.
#
# Usage:
#   ./print-vault-token.sh         # Print token to stdout
#   source ./print-vault-token.sh  # Export token to current shell
#
# Note: The script assumes the polymesh-vault-init container has
# generated a root token in its logs before exiting.

VAULT_TOKEN=$(docker logs polymesh-vault-init-1 --tail=10 |
  grep "Vault Root Token:" | cut -d' ' -f4)

echo $VAULT_TOKEN
