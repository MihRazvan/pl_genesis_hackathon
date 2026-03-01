#!/usr/bin/env bash
set -euo pipefail

PROXY_URL="${1:-http://localhost:8547}"

echo "[1/2] Health check: ${PROXY_URL}/health"
curl -sS "${PROXY_URL}/health" | jq .

echo "[2/2] JSON-RPC eth_blockNumber via proxy"
curl -sS "${PROXY_URL}" \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq .
