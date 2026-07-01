#!/bin/bash
set -euo pipefail

# Quick smoke checks for the optional EVM JSON-RPC endpoint.
RPC_URL="${POLYMESH_ETH_RPC_URL:-http://127.0.0.1:${POLYMESH_ETH_RPC_PORT:-8545}}"
EXPECTED_CHAIN_ID_HEX="${POLYMESH_EVM_CHAIN_ID_HEX:-}"
if [[ -z "$EXPECTED_CHAIN_ID_HEX" ]]; then
  expected_dec="${POLYMESH_EVM_CHAIN_ID:-1641818}"
  EXPECTED_CHAIN_ID_HEX="$(printf '0x%x' "$expected_dec")"
fi

echo "[EVM SMOKE] Using RPC endpoint: $RPC_URL"
echo "[EVM SMOKE] Expecting chain id: $EXPECTED_CHAIN_ID_HEX"

chain_id_response="$(curl -s -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  "$RPC_URL")"

actual_chain_id="$(echo "$chain_id_response" | sed -n 's/.*"result"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
if [[ -z "$actual_chain_id" ]]; then
  echo "[EVM SMOKE] Failed to get chain id response: $chain_id_response"
  exit 1
fi

if [[ "$actual_chain_id" != "$EXPECTED_CHAIN_ID_HEX" ]]; then
  echo "[EVM SMOKE] Chain id mismatch. Got: $actual_chain_id Expected: $EXPECTED_CHAIN_ID_HEX"
  exit 1
fi

echo "[EVM SMOKE] eth_chainId OK: $actual_chain_id"

balance_response="$(curl -s -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac","latest"],"id":1}' \
  "$RPC_URL")"

balance_hex="$(echo "$balance_response" | sed -n 's/.*"result"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
if [[ -z "$balance_hex" ]]; then
  echo "[EVM SMOKE] Failed to get balance response: $balance_response"
  exit 1
fi

echo "[EVM SMOKE] eth_getBalance OK: $balance_hex"

logs_response="$(curl -s -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getLogs","params":[{"fromBlock":"latest","toBlock":"latest"}],"id":1}' \
  "$RPC_URL")"

if ! echo "$logs_response" | grep -q '"result"'; then
  echo "[EVM SMOKE] Failed to query logs: $logs_response"
  exit 1
fi

echo "[EVM SMOKE] eth_getLogs OK"
echo "[EVM SMOKE] All checks passed"
