#!/bin/bash

# This script sets up a Polymesh env, runs the tests and then cleans up its environment
set -e

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

ENV_FILE_ARGS=()
PROFILES=""
# Args that only apply to start-env.sh (stop-env.sh would reject them).
START_ONLY_ARGS=()

while [[ $# -gt 0 ]]; do
	case "$1" in
		--env-file)
			ENV_FILE_ARGS=("$1" "$2")
			shift 2
			;;
		--profile)
			PROFILES="$2"
			shift 2
			;;
		--pull)
			# Policy argument is optional; a bare `--pull` means `always`.
			if [[ -n "${2:-}" && "$2" != -* ]]; then
				START_ONLY_ARGS+=("$1" "$2")
				shift 2
			else
				START_ONLY_ARGS+=("$1")
				shift
			fi
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

# The suite signs with Vault and drives the REST API, both of which live behind
# the `rest-api` profile.
case ",$PROFILES," in
	*,rest-api,*) ;;
	*) PROFILES="${PROFILES:+$PROFILES,}rest-api" ;;
esac

START_STOP_ARGS=("${ENV_FILE_ARGS[@]}" --profile "$PROFILES")

echo "[ENV TEST] Starting environment..."
"${SCRIPT_DIR}/start-env.sh" "${START_STOP_ARGS[@]}" "${START_ONLY_ARGS[@]}"

echo "[ENV TEST] Running tests..."
"${SCRIPT_DIR}/run-tests.sh"

# A full test cycle owns the environment it created, and the suite leaves
# identities and assets on chain that a rerun would trip over, so this teardown
# removes the volumes even though `stop-env.sh` keeps them by default.
echo "[ENV TEST] Cleaning up environment..."
"${SCRIPT_DIR}/stop-env.sh" "${START_STOP_ARGS[@]}" --volumes
