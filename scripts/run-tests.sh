#!/bin/bash
set -e

# This script runs Polymesh integration tests

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Vault token needs to be set so the tests can manage keys
echo "[RUN TESTS] Fetching vault token..."
export VAULT_TOKEN=$("${SCRIPT_DIR}/get-vault-token.sh")

# Run jest with default maxWorkers and any additional arguments passed to this script
echo "[RUN TESTS] Beginning tests..."
yarn jest --maxWorkers=8 "$@"
