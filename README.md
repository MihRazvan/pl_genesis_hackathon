# CLOAKLINE

<!-- Optional banner / hero visual goes here -->
<!-- Example: ![Cloakline banner](./docs/banner.png) -->

Cloakline is a drop-in privacy RPC for Ethereum that reduces wallet surveillance risk with one RPC switch.

It routes wallet traffic through a privacy-preserving RPC layer and uses **Zama fhEVM** to keep operational logging **encrypted, pseudonymous, and write-only**.

[Landing Page](https://cloakline.xyz) | [RPC Endpoint](https://rpc.cloakline.xyz) | [MEV Blocker Inspiration Notes](./MEVBLOCKER_INSPIRATION_NOTES.md)

---

# Problem First

Modern wallet traffic is still surprisingly easy to profile.

In the normal setup, wallets talk directly to upstream RPC providers. That creates a simple place to accumulate a dossier:

- which wallet-related methods were called
- which addresses were queried
- when the user was active
- which direct client path the traffic came from

Over time, that makes wallet-linked surveillance easier than it should be.

**Cloakline** exists to reduce that linkage surface without forcing users into a new wallet or a new transaction flow.

> Switch one RPC URL, keep using the same wallet, and reduce direct provider-side linkage.

---

# Overview

Cloakline is a privacy-focused RPC layer for Ethereum.

It sits between the wallet and the upstream provider, forwards requests through a cleaner trust boundary, and logs selected operational signals on-chain through fhEVM as encrypted counts under salted pseudonymous bucket IDs.

## Core ideas

1. **ONE RPC SWITCH**
Users should be able to adopt Cloakline by changing the RPC endpoint in an existing wallet.

2. **LOWER LINKAGE RISK**
The upstream provider sees Cloakline as the request path instead of the same direct client-origin relationship.

3. **NO RAW WALLET ADDRESSES ON-CHAIN**
The logging layer stores salted pseudonymous bucket IDs, not raw addresses.

4. **WRITE-ONLY ENCRYPTED LOGGING**
Cloakline can write usage counts on-chain, but it cannot decrypt the accumulated history later.

---

# What Makes It Special

There are already privacy-oriented RPC and relay products.

Cloakline is different because it combines:

- a **drop-in RPC product surface**
- an **honest privacy model**
- and **fhEVM-backed encrypted operational logging**

This is not just a proxy demo.

It is a privacy RPC with an on-chain logging layer where:

- the identity key is pseudonymous
- the count is encrypted
- and the logger is write-only

That separation of write authority from read authority is the most distinctive part of the design.

---

# How It Works

<!-- Optional architecture visual / Excalidraw goes here -->
<!-- Example: ![Technical architecture](./docs/architecture.png) -->

## Without Cloakline

1. The wallet sends RPC requests directly to the upstream provider.
2. The provider sees the request flow from the direct client path.
3. Queried addresses and methods remain visible in the payload.
4. Over time, this makes wallet-linked profiling easier.

## With Cloakline

1. The wallet sends the same RPC request to Cloakline.
2. Cloakline sanitizes and forwards the request upstream.
3. The upstream sees Cloakline as the request path instead of the direct client relationship.
4. Selected methods are batched and logged on-chain.
5. The logging contract stores encrypted counts by salted pseudonymous bucket ID.
6. The logger can write those counts, but cannot decrypt them back later.

## Full flow

`Wallet -> Cloakline RPC -> Upstream RPC -> fhEVM logging contract`

---

# Trust Model

This project is deliberately honest about its scope.

## What is protected

- Upstream providers no longer see the same direct user-to-provider path.
- On-chain logging does not store raw wallet addresses.
- Logged usage counts are encrypted with fhEVM.
- The logger is write-only for those encrypted counts.

## What is not protected

- The Cloakline proxy still sees live metadata while forwarding requests.
- Payload confidentiality from the proxy is **not** solved in this MVP.
- Wallet analytics outside the RPC path are outside Cloakline's control.
- This is **not** full anonymity.

## Why this still matters

The goal is not to pretend that every signal disappears.

The goal is to make the easiest surveillance path weaker:

- reduce direct provider-side linkage
- reduce dossier accumulation risk
- avoid publishing raw wallet identity in the on-chain logging layer

---

# Demo Story

The intended demo arc is simple:

1. Show the normal direct RPC path.
2. Show the same wallet flow through Cloakline.
3. Show that the transaction still works.
4. Show the proxy logs.
5. Show the on-chain bucket event and encrypted logging state.

That is the product story:

- same wallet flow
- one RPC switch
- lower linkage risk
- encrypted write-only logging

---

# Quickstart

## Install

```bash
pnpm install
```

## Run the proxy locally

```bash
cp .env.example .env
pnpm test
pnpm dev
```

The proxy listens on:

- `http://localhost:8547`

## Run the landing page locally

```bash
cp site/.env.example site/.env
pnpm site:dev
```

## Demo evidence bundle

```bash
pnpm demo:before-after
```

This writes a reproducible before/after capture under:

- `demo/evidence/<timestamp>/`

## Full pre-demo check

```bash
pnpm demo:check
```

## Inspect the contract state

```bash
pnpm state:contract
```

---

# Contracts

The fhEVM contract lives in:

- `contracts/contracts/PrivateQueryLog.sol`

It stores encrypted usage counts keyed by salted pseudonymous bucket ID.

## Contract workflow

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

---

# Runtime Config

## Proxy

- `PORT`
- `UPSTREAM_RPC_URLS`
- `REQUEST_TIMEOUT_MS`
- `QUERY_LOG_ENABLED`
- `QUERY_LOG_RPC_URL`
- `QUERY_LOG_PRIVATE_KEY`
- `QUERY_LOG_CONTRACT_ADDRESS`
- `QUERY_LOG_USER_SALT`
- `QUERY_LOG_CONFIRMATIONS`
- `QUERY_LOG_METHODS`
- `QUERY_LOG_FLUSH_MS`
- `QUERY_LOG_BATCH_MAX`

## Landing page

Configured through `site/.env`:

- `VITE_RPC_URL`
- `VITE_CHAIN_NAME`
- `VITE_CHAIN_ID`
- `VITE_CURRENCY_NAME`
- `VITE_CURRENCY_SYMBOL`
- `VITE_BLOCK_EXPLORER_URL`
- `VITE_RPC_PLACEHOLDER`

---

# Current State

Implemented:

- TypeScript RPC proxy with upstream fallback
- sanitized upstream forwarding headers
- health endpoint
- non-blocking batched on-chain logging
- React + Vite landing page
- wallet-aware setup UX
- fhEVM query logging contract
- Sepolia deployment flow
- contract-state inspection tooling
- before/after demo evidence generation

Known limitation:

- same-chain RPC replacement is not uniformly supported as a one-click wallet flow across all wallets, so some wallets require manual RPC editing for built-in chains like Sepolia or Mainnet

---

# Tech Stack

| Component | Technology | Purpose |
| --- | --- | --- |
| RPC proxy | **Node.js / TypeScript / Fastify** | Request forwarding and sanitization |
| Landing page | **React / Vite** | Product surface and wallet onboarding |
| Wallet discovery | **mipd / EIP-6963** | Injected wallet detection |
| Logging contract | **Zama fhEVM** | Encrypted write-only operational logging |
| Contracts | **Hardhat** | Compile, test, deploy |
| Demo tooling | **Shell scripts / tsx** | State inspection and evidence generation |

---

# Future Work

The strongest future direction is not “more counters.”

It is stronger privacy along the transport path.

Likely next steps:

- better wallet-specific setup UX
- clearer trust-model visualization
- stronger transport-layer privacy so the proxy learns less live metadata
- more productized RPC modes and endpoint policies

---

Built for the PL Genesis hackathon.
