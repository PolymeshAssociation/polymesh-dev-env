#!/bin/bash

set -e

# This script cleans up the test environment

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

COMPOSE_ENV="${SCRIPT_DIR}/../envs/latest"

echo "[ENV STOP] Cleaning up the docker environment..."
docker compose --env-file "$COMPOSE_ENV" down -v

echo "[ENV STOP] docker env cleaned up"
