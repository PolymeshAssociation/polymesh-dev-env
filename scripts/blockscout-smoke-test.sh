#!/bin/bash
set -euo pipefail

EXPLORER_API_URL="${POLYMESH_BLOCKSCOUT_API_URL:-http://127.0.0.1:${POLYMESH_BLOCKSCOUT_BACKEND_PORT:-4001}}"
SMOKE_PATH="${POLYMESH_BLOCKSCOUT_SMOKE_PATH:-/api/v2/stats}"
SMOKE_URL="${EXPLORER_API_URL%/}${SMOKE_PATH}"

echo "[BLOCKSCOUT SMOKE] Checking explorer endpoint: $SMOKE_URL"

status_code="$(curl -s -o /tmp/blockscout-smoke.out -w '%{http_code}' "$SMOKE_URL")"
if [[ "$status_code" != "200" ]]; then
  echo "[BLOCKSCOUT SMOKE] Unexpected HTTP status: $status_code"
  cat /tmp/blockscout-smoke.out
  exit 1
fi

if grep -qi 'page not found' /tmp/blockscout-smoke.out; then
  echo "[BLOCKSCOUT SMOKE] Response indicates a missing endpoint."
  cat /tmp/blockscout-smoke.out
  exit 1
fi

if ! grep -Eq '"average_block_time"|"status"' /tmp/blockscout-smoke.out; then
  echo "[BLOCKSCOUT SMOKE] Response does not look like a Blockscout API payload."
  echo "[BLOCKSCOUT SMOKE] First lines:"
  head -n 5 /tmp/blockscout-smoke.out
  exit 1
fi

echo "[BLOCKSCOUT SMOKE] Explorer API reachable and returned expected payload"
