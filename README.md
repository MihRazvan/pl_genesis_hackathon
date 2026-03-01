# Private RPC (Hackathon MVP)

Privacy-preserving Ethereum RPC proxy for the PL Genesis hackathon.

## Milestone 1 status

Implemented:
- TypeScript RPC proxy (`POST /`) with upstream fallback
- Sanitized upstream forwarding headers
- Health endpoint (`GET /health`)
- Automated tests for forwarding/fallback/error paths
- Manual smoke script

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm test
pnpm dev
```

In another terminal:

```bash
./scripts/smoke-proxy.sh
```

## Config

- `PORT` (default: `8547`)
- `UPSTREAM_RPC_URLS` (comma-separated)
- `REQUEST_TIMEOUT_MS` (default: `10000`)

Default upstreams are Sepolia public endpoints for no-key MVP testing.
