#!/bin/bash

#!/bin/bash

# This script starts up a dev environment via compose and executes a suite of integration tests

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

COMPOSE_ENV="${SCRIPT_DIR}/../envs/latest"

echo "Starting env using $COMPOSE_ENV"
docker compose --env-file "$COMPOSE_ENV" up --detach

echo "Waiting for a fully initialized environment..."
docker compose wait environment-ready >/dev/null 2>&1

echo "Polymesh dev environment started"