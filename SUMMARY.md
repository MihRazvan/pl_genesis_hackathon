# Project Summary

Cloakline is a drop-in privacy RPC for Ethereum that reduces wallet surveillance risk with a single RPC switch. No new wallet. No changes to how users transact. Just a URL change that moves the trust boundary.

## The problem

When wallets talk directly to upstream RPC providers, those providers accumulate a clear picture over time: which addresses were queried, which methods were called, when the user was active, and where traffic originated. This makes wallet-linked profiling easier than most users realize.

## The solution

Cloakline sits between the wallet and the upstream provider. It forwards requests through a cleaner trust boundary, so the upstream sees Cloakline as the request path rather than a direct client relationship. No raw wallet addresses are exposed in the logging layer. No new setup is required on the user side.

## The Zama integration

The most distinctive part of Cloakline is its on-chain logging layer, built on Zama fhEVM. Selected RPC methods are batched and logged to a Sepolia smart contract as encrypted counts under salted pseudonymous bucket IDs. The identity key is a hash of a salt and the wallet address — the raw address is never stored. The counts are encrypted using Zama's euint32 type. This means the logger can write usage data on-chain but cannot decrypt it back later. That separation of write authority from read authority is the core privacy guarantee of the logging layer, and it would not be possible without fhEVM.

## Architecture

The proxy is built on Node.js, TypeScript, and Fastify. The website is React and Vite, with EIP-6963 wallet discovery for one-click RPC onboarding. Contracts are compiled and deployed with Hardhat. The full request flow is:

`Wallet → Cloakline RPC → Upstream RPC → fhEVM logging contract on Sepolia`

## Track

Submitted under Infrastructure & Digital Rights and the Zama: Confidential Onchain Finance bounty. Built during this hackathon as a fresh project.
