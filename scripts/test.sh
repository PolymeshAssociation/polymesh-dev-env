#!/bin/bash

# This script sets up a Polymesh env, runs the tests and then cleans up its environment
set -e

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "[ENV TEST] Starting environment..."
"${SCRIPT_DIR}/start-env.sh"

echo "[ENV TEST] Running tests..."
"${SCRIPT_DIR}/run-tests.sh"

echo "[ENV TEST] Cleaning up environment..."
"${SCRIPT_DIR}/stop-env.sh"
