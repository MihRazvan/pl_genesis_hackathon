# Cloakline

Cloakline is a privacy-preserving Ethereum RPC for the PL Genesis hackathon.

## Milestone status

Implemented:
- TypeScript RPC proxy (`POST /`) with upstream fallback
- Sanitized upstream forwarding headers
- Health endpoint (`GET /health`)
- Automated tests for forwarding/fallback/error paths
- Manual smoke script
- Hardhat fhEVM project in `contracts/`
- `PrivateQueryLog` contract with encrypted pseudonymous-bucket query counts
- fhEVM mock test proving encrypted write + write-only logger permissions
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
- `QUERY_LOG_USER_SALT=<long_random_secret_salt>`
- `QUERY_LOG_CONFIRMATIONS=0` (or higher if you want confirmation waits)
- `QUERY_LOG_METHODS=eth_sendRawTransaction,eth_getTransactionReceipt,eth_getTransactionCount`
- `QUERY_LOG_FLUSH_MS=5000`
- `QUERY_LOG_BATCH_MAX=20`

In another terminal:

```bash
./scripts/smoke-proxy.sh
```

## Demo artifacts

Capture a reproducible before/after evidence bundle:

```bash
pnpm demo:before-after
```

Run a full pre-demo sanity check (tests, typecheck, local proxy smoke check, optional contract state, evidence capture):

```bash
pnpm demo:check
```

`demo:check` auto-loads `.env` (if present). For the on-chain state step, set `QUERY_LOG_CONTRACT_ADDRESS` and `QUERY_LOG_RPC_URL` (or `SEPOLIA_RPC_URL`).

This writes files under `demo/evidence/<timestamp>/`:
- direct RPC request/response captures (`before_direct_*`)
- proxy RPC request/response captures (`after_proxy_*`)
- proxy health snapshot
- contract state snapshot (`logger`, `totalBuckets`, recent events)

Inspect contract state directly anytime:

```bash
pnpm state:contract
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
- `QUERY_LOG_USER_SALT` (server-side secret used to hash users into pseudonymous buckets)
- `QUERY_LOG_CONFIRMATIONS` (confirmations to wait for each logging tx)
- `QUERY_LOG_METHODS` (comma-separated allowlist of RPC methods to log)
- `QUERY_LOG_FLUSH_MS` (buffer window before sending batched logs)
- `QUERY_LOG_BATCH_MAX` (flush early when queued logged requests reach this size)

Default upstreams are Sepolia public endpoints for no-key MVP testing.

## Trust model

What is protected:
- Upstream RPC cannot directly observe user-to-provider connections; it only sees proxy-origin traffic.
- On-chain logging does not store raw wallet addresses, only salted pseudonymous `userBucketId`.
- Logger is write-only for encrypted counts; contract ACL does not grant logger decrypt rights.
- Public observers can see that a bucket was incremented, but not plaintext encrypted counts.

What is not protected:
- The proxy can still observe live traffic metadata (`IP`, request payload, timing) while forwarding.
- Wallet telemetry outside RPC path (for example wallet analytics endpoints) is outside this proxy's control.
- Upstream still sees forwarded RPC payload content from the proxy itself (transport identity is improved, payload confidentiality is not).

Why this model:
- This project prioritizes unlinkability and surveillance-risk reduction (prevent easy IP->wallet dossier accumulation) rather than claiming full anonymity.
- The design intentionally separates write authority from read authority: proxy can log encrypted operational data but cannot decrypt accumulated history.
- Contract exposes `totalBuckets` as a privacy-safe aggregate metric for demo visibility.
