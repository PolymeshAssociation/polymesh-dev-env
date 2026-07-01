#!/bin/bash
set -e

# This script starts the test environment

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

COMPOSE_ENV_DEFAULT="${SCRIPT_DIR}/../envs/latest"
COMPOSE_ENV="${COMPOSE_ENV:-$COMPOSE_ENV_DEFAULT}"
COMPOSE_PROFILES="${COMPOSE_PROFILES:-}"

while [[ $# -gt 0 ]]; do
	case "$1" in
		--env-file)
			COMPOSE_ENV="$2"
			shift 2
			;;
		--profile)
			COMPOSE_PROFILES="$2"
			shift 2
			;;
		*)
			echo "[START ENV] Unknown argument: $1"
			exit 1
			;;
	esac
done

if [[ "${COMPOSE_ENV}" != /* ]]; then
	COMPOSE_ENV="${SCRIPT_DIR}/../${COMPOSE_ENV}"
fi

COMPOSE_ARGS=(--env-file "$COMPOSE_ENV")

if [[ -n "$COMPOSE_PROFILES" ]]; then
	IFS=',' read -r -a PROFILE_ARRAY <<< "$COMPOSE_PROFILES"
	for profile in "${PROFILE_ARRAY[@]}"; do
		COMPOSE_ARGS+=(--profile "$profile")
	done
fi

echo "[START ENV] Starting env using $COMPOSE_ENV"
docker compose "${COMPOSE_ARGS[@]}" up --detach

echo "[START ENV] Waiting for a fully initialized environment..."
# `|| true` swallows all errors, but `docker wait` exits with non-zero in the expected case
docker compose "${COMPOSE_ARGS[@]}" wait environment-ready >/dev/null || true

echo "[START ENV] Polymesh dev environment started"
