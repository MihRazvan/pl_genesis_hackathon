# VERIFY CLOAKLINE

This page is the fastest way to verify that Cloakline is live and that the fhEVM logging model is real.

- Website: https://cloakline.xyz
- RPC endpoint: https://rpc.cloakline.xyz
- Network: Sepolia
- Contract: [`0x5f9a1567ee154Eb20acdBe7D35cb6771040Fd600`](https://sepolia.etherscan.io/address/0x5f9a1567ee154Eb20acdBe7D35cb6771040Fd600)
- Logger: `0x92AAe0857979a139344f5b6F008e71F27A507522`

---

# What to verify

## 1. The product is live

Open:

- https://cloakline.xyz
- https://rpc.cloakline.xyz

The website is the public product surface. The RPC endpoint is the live Sepolia RPC users point their wallet to.

## 2. The contract is live on Sepolia

Open the contract on Etherscan:

- https://sepolia.etherscan.io/address/0x5f9a1567ee154Eb20acdBe7D35cb6771040Fd600

What to look for:

- `QueryBucketIncremented` events
- the configured logger address
- public `totalBuckets`

`totalBuckets` is an aggregate counter. It shows how many distinct pseudonymous buckets have been seen, without revealing raw wallet addresses or plaintext counts.

## 3. The write-only fhEVM model is intentional

The core design point is that Cloakline can write encrypted usage counts on-chain, but it cannot decrypt them back later.

The contract deliberately keeps decrypt authority away from the logger:

- [`contracts/contracts/PrivateQueryLog.sol`](./contracts/contracts/PrivateQueryLog.sol#L44)

The test that proves this behavior is:

- [`contracts/test/PrivateQueryLog.test.ts`](./contracts/test/PrivateQueryLog.test.ts#L5)

The key assertion is the test name itself:

`stores encrypted query count by user bucket without granting logger decrypt rights`

It writes a count, fetches the encrypted handle, then verifies that logger-side decryption fails.

## 4. The verification script shows live state

From the repo root, with the Sepolia contract env vars set:

```bash
pnpm state:contract
```

This prints:

- chain ID
- latest block
- contract address
- logger address
- `totalBuckets`
- recent `QueryBucketIncremented` events

The script lives here:

- [`scripts/check-contract-state.ts`](./scripts/check-contract-state.ts)

## 5. The write-only test suite is reproducible

Run:

```bash
pnpm contracts:test
```

The important proof is that the logger can increment encrypted counts but cannot decrypt them later.

---

# What this proves

- Cloakline is a live Sepolia RPC product, not just a local prototype.
- The fhEVM contract is deployed and receiving real events.
- Raw wallet addresses are not written on-chain by the logging layer.
- Usage counts are encrypted on-chain.
- The logger is write-only by design.
