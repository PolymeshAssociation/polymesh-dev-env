#!/bin/bash

# This script starts up a dev environment via docker compose
set -e

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

COMPOSE_ENV="${SCRIPT_DIR}/../envs/latest"

echo "[START ENV] Starting env using $COMPOSE_ENV"
docker compose --env-file "$COMPOSE_ENV" up --detach

echo "[START ENV] Waiting for a fully initialized environment..."
docker compose --env-file "$COMPOSE_ENV" wait environment-ready >/dev/null

echo "[START ENV] Polymesh dev environment started"
