#!/bin/bash

set -e

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

COMPOSE_ENV="${SCRIPT_DIR}/../envs/latest"

echo "[ENV START] Starting env using $COMPOSE_ENV"
docker compose --env-file "$COMPOSE_ENV" up --detach
echo "[ENV START] Docker env started. Now waiting for ready"

echo "[ENV START] Waiting for a fully initialized environment..."
# `|| true` swallows all errors, but wait exits with non-zero in the expected case
docker compose --env-file "$COMPOSE_ENV" wait environment-ready >/dev/null || true

echo "[ENV START] Polymesh dev environment started"
