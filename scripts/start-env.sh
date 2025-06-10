#!/bin/bash
set -e

# This script starts the test environment

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

COMPOSE_ENV="${SCRIPT_DIR}/../envs/latest"

echo "[START ENV] Starting env using $COMPOSE_ENV"
docker compose --env-file "$COMPOSE_ENV" up --detach

echo "[START ENV] Waiting for a fully initialized environment..."
# `|| true` swallows all errors, but `docker wait` exits with non-zero in the expected case
docker compose --env-file "$COMPOSE_ENV" wait environment-ready >/dev/null || true

echo "[START ENV] Polymesh dev environment started"
