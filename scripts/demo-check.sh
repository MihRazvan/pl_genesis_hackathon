#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install jq and rerun." >&2
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

PORT="${DEMO_CHECK_PORT:-18547}"
PROXY_URL="${DEMO_CHECK_PROXY_URL:-http://127.0.0.1:${PORT}}"
PROXY_PID=""

cleanup() {
  if [[ -n "${PROXY_PID}" ]]; then
    kill "${PROXY_PID}" >/dev/null 2>&1 || true
    wait "${PROXY_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

wait_for_proxy() {
  local tries=40
  while (( tries > 0 )); do
    if curl -fsS "${PROXY_URL}/health" >/dev/null 2>&1; then
      return 0
    fi
    tries=$((tries - 1))
    sleep 0.5
  done
  return 1
}

echo "[1/6] Running unit tests"
QUERY_LOG_ENABLED=false pnpm test

echo "[2/6] Running typecheck"
QUERY_LOG_ENABLED=false pnpm typecheck

if curl -fsS "${PROXY_URL}/health" >/dev/null 2>&1; then
  echo "[3/6] Reusing existing proxy at ${PROXY_URL}"
else
  logger_enabled="${QUERY_LOG_ENABLED:-false}"
  if [[ "${logger_enabled}" == "true" ]]; then
    if [[ -z "${QUERY_LOG_RPC_URL:-}" || -z "${QUERY_LOG_PRIVATE_KEY:-}" || -z "${QUERY_LOG_CONTRACT_ADDRESS:-}" || -z "${QUERY_LOG_USER_SALT:-}" ]]; then
      echo "[3/6] QUERY_LOG_ENABLED=true but logging env is incomplete; starting proxy with query logging disabled"
      logger_enabled="false"
    fi
  fi

  echo "[3/6] Starting proxy at ${PROXY_URL}"
  PORT="${PORT}" QUERY_LOG_ENABLED="${logger_enabled}" pnpm start >/tmp/cloakline-demo-check.log 2>&1 &
  PROXY_PID=$!

  if ! wait_for_proxy; then
    echo "Proxy failed to start. Last logs:" >&2
    tail -n 100 /tmp/cloakline-demo-check.log >&2 || true
    exit 1
  fi
fi

echo "[4/6] Running smoke check against ${PROXY_URL}"
./scripts/smoke-proxy.sh "${PROXY_URL}"

echo "[5/6] Checking on-chain contract state (if configured)"
if [[ -n "${QUERY_LOG_CONTRACT_ADDRESS:-}" && (-n "${QUERY_LOG_RPC_URL:-}" || -n "${SEPOLIA_RPC_URL:-}") ]]; then
  pnpm state:contract
else
  echo "Skipping contract state check: set QUERY_LOG_CONTRACT_ADDRESS and QUERY_LOG_RPC_URL (or SEPOLIA_RPC_URL)"
fi

echo "[6/6] Generating demo evidence bundle"
PROXY_URL="${PROXY_URL}" pnpm demo:before-after

echo "Demo check completed."
