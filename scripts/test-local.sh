#!/bin/bash

# This script sets up a Polymesh env with local REST API image, runs the tests and then cleans up its environment
set -e

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "[ENV TEST LOCAL] Starting environment with local REST API image..."
"${SCRIPT_DIR}/start-env-local.sh"

echo "[ENV TEST LOCAL] Running tests..."
"${SCRIPT_DIR}/run-tests.sh"

echo "[ENV TEST LOCAL] Cleaning up environment..."
"${SCRIPT_DIR}/stop-env-local.sh"
