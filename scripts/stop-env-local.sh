#!/bin/bash
set -e

# This script stops the test environment with local REST API image

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

COMPOSE_ENV="${SCRIPT_DIR}/../envs/local"

echo "[STOP ENV LOCAL] Stopping env using $COMPOSE_ENV"
docker compose --env-file "$COMPOSE_ENV" down

echo "[STOP ENV LOCAL] Polymesh dev environment with local REST API stopped"
