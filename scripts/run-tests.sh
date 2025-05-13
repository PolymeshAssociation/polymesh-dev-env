#!/bin/bash

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

export VAULT_TOKEN=$("${SCRIPT_DIR}/get-vault-token.sh")

# Run jest with default maxWorkers and any additional arguments passed to this script
jest --maxWorkers=8 "$@"