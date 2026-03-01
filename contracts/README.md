# Contracts (fhEVM)

This folder contains the Zama fhEVM contract project used by the Private RPC proxy.

## Contract

- `PrivateQueryLog.sol`
- Stores encrypted query counts per user address.
- Uses `@fhevm/solidity` and Zama network config.
- Includes `incrementQueryCountFor(address user, uint32 delta)` for proxy-side logging by an authorized logger wallet.

## Prerequisites

- Node.js 20+
- pnpm
- Sepolia wallet with test ETH (only for Sepolia deploy)

## Install and test

```bash
pnpm --dir contracts install
pnpm --dir contracts compile
pnpm --dir contracts test
```

The test uses fhevm mock mode on local hardhat.

## Local deployment sanity check

```bash
pnpm --dir contracts deploy:hardhat
```

## Sepolia deployment

1. Prepare env:

```bash
cp contracts/.env.example contracts/.env
```

2. Edit `contracts/.env`:

- Set `DEPLOYER_PRIVATE_KEY` to your Sepolia deployer private key.
- Optionally override `SEPOLIA_RPC_URL` (default is publicnode).
- Optional: set `PROXY_LOGGER_ADDRESS` to the proxy wallet address allowed to call
  `incrementQueryCountFor`. If omitted, deployer is used.

3. Deploy:

```bash
pnpm --dir contracts deploy:sepolia
```

4. Deployed address is printed in terminal and written by hardhat-deploy under `contracts/deployments/`.
