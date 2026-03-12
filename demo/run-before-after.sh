#!/usr/bin/env bash
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for this script." >&2
  exit 1
fi

DIRECT_RPC_URL="${DIRECT_RPC_URL:-https://ethereum-sepolia-rpc.publicnode.com}"
PROXY_URL="${PROXY_URL:-http://localhost:8547}"
DEMO_ADDRESS="${DEMO_ADDRESS:-0x93B299639d6730165Fb6bc1317569f94461023F7}"
FLUSH_WAIT_SECONDS="${DEMO_FLUSH_WAIT_SECONDS:-7}"

RUN_ID="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="demo/evidence/${RUN_ID}"
mkdir -p "${OUT_DIR}"

call_rpc() {
  local url="$1"
  local method="$2"
  local params_json="$3"
  local id="$4"
  local out_json="$5"
  local out_headers="$6"

  local payload
  payload=$(jq -cn \
    --arg method "${method}" \
    --argjson params "${params_json}" \
    --argjson id "${id}" \
    '{jsonrpc:"2.0", method:$method, params:$params, id:$id}')

  curl -sS -D "${out_headers}" "${url}" \
    -H 'content-type: application/json' \
    --data "${payload}" | jq . > "${out_json}"
}

echo "[0/4] Checking proxy health at ${PROXY_URL}/health"
curl -sS "${PROXY_URL}/health" | jq . > "${OUT_DIR}/proxy_health.json"

echo "[1/4] BEFORE: direct upstream RPC captures"
call_rpc "${DIRECT_RPC_URL}" "eth_chainId" "[]" 1 \
  "${OUT_DIR}/before_direct_chainId.json" \
  "${OUT_DIR}/before_direct_chainId.headers.txt"

call_rpc "${DIRECT_RPC_URL}" "eth_getTransactionCount" "[\"${DEMO_ADDRESS}\",\"latest\"]" 2 \
  "${OUT_DIR}/before_direct_getTransactionCount.json" \
  "${OUT_DIR}/before_direct_getTransactionCount.headers.txt"

echo "[2/4] AFTER: through proxy captures"
call_rpc "${PROXY_URL}" "eth_chainId" "[]" 3 \
  "${OUT_DIR}/after_proxy_chainId.json" \
  "${OUT_DIR}/after_proxy_chainId.headers.txt"

call_rpc "${PROXY_URL}" "eth_getTransactionCount" "[\"${DEMO_ADDRESS}\",\"latest\"]" 4 \
  "${OUT_DIR}/after_proxy_getTransactionCount_1.json" \
  "${OUT_DIR}/after_proxy_getTransactionCount_1.headers.txt"

call_rpc "${PROXY_URL}" "eth_getTransactionCount" "[\"${DEMO_ADDRESS}\",\"latest\"]" 5 \
  "${OUT_DIR}/after_proxy_getTransactionCount_2.json" \
  "${OUT_DIR}/after_proxy_getTransactionCount_2.headers.txt"

echo "[3/4] Waiting ${FLUSH_WAIT_SECONDS}s so batched on-chain logger can flush"
sleep "${FLUSH_WAIT_SECONDS}"

echo "[4/4] Capturing on-chain logger state (if QUERY_LOG_* env vars are set)"
if [[ -n "${QUERY_LOG_RPC_URL:-}" && -n "${QUERY_LOG_CONTRACT_ADDRESS:-}" ]]; then
  pnpm exec tsx scripts/check-contract-state.ts > "${OUT_DIR}/contract_state.txt" || true
else
  echo "QUERY_LOG_RPC_URL / QUERY_LOG_CONTRACT_ADDRESS not set; skipping contract state capture" > "${OUT_DIR}/contract_state.txt"
fi

cat > "${OUT_DIR}/README.txt" <<TXT
Demo evidence bundle: ${OUT_DIR}

Files to present:
- before_direct_*.headers.txt and before_direct_*.json
- after_proxy_*.headers.txt and after_proxy_*.json
- proxy_health.json
- contract_state.txt

Interpretation:
1) BEFORE: wallet/client goes directly to upstream RPC URL.
2) AFTER: wallet/client talks to proxy URL, proxy forwards upstream.
3) contract_state.txt shows logger address, totalBuckets, and recent QueryBucketIncremented events.
TXT

echo "Evidence bundle created at: ${OUT_DIR}"
echo "Open ${OUT_DIR}/README.txt for presentation order."
