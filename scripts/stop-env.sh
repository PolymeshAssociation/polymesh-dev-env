#!/bin/bash
set -e

# This script cleans up the test environment

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

COMPOSE_ENV_DEFAULT="${SCRIPT_DIR}/../envs/latest"
COMPOSE_ENV="${COMPOSE_ENV:-$COMPOSE_ENV_DEFAULT}"
COMPOSE_PROFILES="${COMPOSE_PROFILES:-}"
# The teardown keeps named volumes (chain data, Vault keys, Blockscout DB, ...)
# so the next start resumes from the existing state. Pass --volumes for a clean
# slate.
REMOVE_VOLUMES=false

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
		--volumes|-v)
			REMOVE_VOLUMES=true
			shift
			;;
		--keep-volumes)
			# Now the default; still accepted so existing invocations work.
			shift
			;;
		*)
			echo "[STOP ENV] Unknown argument: $1"
			exit 1
			;;
	esac
done

# Always tear down with the optional profiles enabled so profile-gated services
# (eth-rpc, Blockscout, Vault, the REST APIs, ...) are removed even when the
# caller omits --profile. Without this, `down` leaves those containers running.
for required_profile in evm rest-api; do
	case ",$COMPOSE_PROFILES," in
		*",$required_profile,"*) ;;
		*) COMPOSE_PROFILES="${COMPOSE_PROFILES:+$COMPOSE_PROFILES,}$required_profile" ;;
	esac
done

if [[ "${COMPOSE_ENV}" != /* ]]; then
	COMPOSE_ENV="${SCRIPT_DIR}/../${COMPOSE_ENV}"
fi

if [[ ! -f "$COMPOSE_ENV" ]]; then
	echo "[STOP ENV] Env file not found: $COMPOSE_ENV"
	exit 1
fi

COMPOSE_ARGS=(--env-file "$COMPOSE_ENV")

if [[ -n "$COMPOSE_PROFILES" ]]; then
	IFS=',' read -r -a PROFILE_ARRAY <<< "$COMPOSE_PROFILES"
	for profile in "${PROFILE_ARRAY[@]}"; do
		COMPOSE_ARGS+=(--profile "$profile")
	done
fi

DOWN_ARGS=(down)
if [[ "$REMOVE_VOLUMES" == true ]]; then
	DOWN_ARGS+=(--volumes)
	echo "[STOP ENV] Cleaning up the docker environment (removing named volumes)..."
else
	echo "[STOP ENV] Stopping the docker environment (named volumes preserved)..."
fi

docker compose "${COMPOSE_ARGS[@]}" "${DOWN_ARGS[@]}"

echo "[STOP ENV] docker env cleaned up"
