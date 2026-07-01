#!/bin/bash

# This script sets up a Polymesh env, runs the tests and then cleans up its environment
set -e

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

START_STOP_ARGS=()

while [[ $# -gt 0 ]]; do
	case "$1" in
		--env-file|--profile)
			START_STOP_ARGS+=("$1" "$2")
			shift 2
			;;
		--)
			shift
			break
			;;
		*)
			break
			;;
	esac
done

echo "[ENV TEST] Starting environment..."
"${SCRIPT_DIR}/start-env.sh" "${START_STOP_ARGS[@]}"

echo "[ENV TEST] Running tests..."
"${SCRIPT_DIR}/run-tests.sh"

echo "[ENV TEST] Cleaning up environment..."
"${SCRIPT_DIR}/stop-env.sh" "${START_STOP_ARGS[@]}"
