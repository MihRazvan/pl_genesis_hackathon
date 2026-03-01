# Private RPC (Hackathon MVP)

Privacy-preserving Ethereum RPC proxy for the PL Genesis hackathon.

## Milestone status

Implemented:
- TypeScript RPC proxy (`POST /`) with upstream fallback
- Sanitized upstream forwarding headers
- Health endpoint (`GET /health`)
- Automated tests for forwarding/fallback/error paths
- Manual smoke script
- Hardhat fhEVM project in `contracts/`
- `PrivateQueryLog` contract with encrypted per-user query counts
- fhEVM mock test proving encrypted write + authorized decrypt
- Deploy scripts for local hardhat and Sepolia
- Proxy integration for non-blocking on-chain query logging

## Proxy quick start

```bash
pnpm install
cp .env.example .env
pnpm test
pnpm dev
```

To enable on-chain logging in the proxy, set these in `.env`:
- `QUERY_LOG_ENABLED=true`
- `QUERY_LOG_RPC_URL=<sepolia_rpc_url>`
- `QUERY_LOG_PRIVATE_KEY=<proxy_logger_wallet_private_key>`
- `QUERY_LOG_CONTRACT_ADDRESS=<deployed_PrivateQueryLog_address>`
- `QUERY_LOG_CONFIRMATIONS=0` (or higher if you want confirmation waits)

In another terminal:

```bash
./scripts/smoke-proxy.sh
```

## Contracts quick start (Hardhat + fhEVM)

```bash
pnpm contracts:install
pnpm contracts:compile
pnpm contracts:test
pnpm contracts:deploy:hardhat
```

For Sepolia deployment:

```bash
cp contracts/.env.example contracts/.env
# set DEPLOYER_PRIVATE_KEY in contracts/.env
pnpm contracts:deploy:sepolia
```

## Config (proxy)

- `PORT` (default: `8547`)
- `UPSTREAM_RPC_URLS` (comma-separated)
- `REQUEST_TIMEOUT_MS` (default: `10000`)
- `QUERY_LOG_ENABLED` (default: `false`)
- `QUERY_LOG_RPC_URL` (RPC used to send logging txs)
- `QUERY_LOG_PRIVATE_KEY` (wallet used by proxy to log on-chain)
- `QUERY_LOG_CONTRACT_ADDRESS` (deployed `PrivateQueryLog` contract)
- `QUERY_LOG_CONFIRMATIONS` (confirmations to wait for each logging tx)

Default upstreams are Sepolia public endpoints for no-key MVP testing.
