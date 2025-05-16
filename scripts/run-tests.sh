#!/bin/bash

# This script starts up a dev environment via compose and executes a suite of integration tests

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

docker compose up -d

echo "Waiting for a fully initialized environment..."
docker compose wait environment-ready >/dev/null 2>&1

# Vault token needs to be set so the tests can manage keys
export VAULT_TOKEN=$("${SCRIPT_DIR}/get-vault-token.sh")

# Run jest with default maxWorkers and any additional arguments passed to this script
echo "Beginning tests..."
jest --maxWorkers=8 "$@"

# echo "Cleaning up test env..."
# docker compose down -v