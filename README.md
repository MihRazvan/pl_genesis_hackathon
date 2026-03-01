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

## Proxy quick start

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

Default upstreams are Sepolia public endpoints for no-key MVP testing.
