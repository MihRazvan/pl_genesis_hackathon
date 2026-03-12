import { Contract, JsonRpcProvider } from "ethers";

const ABI = [
  "function logger() view returns (address)",
  "function totalBuckets() view returns (uint256)",
  "event QueryBucketIncremented(bytes32 indexed userBucketId)"
];

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric env var: ${name}=${raw}`);
  }

  return parsed;
}

async function main(): Promise<void> {
  const rpcUrl = process.env.QUERY_LOG_RPC_URL ?? process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    throw new Error("Set QUERY_LOG_RPC_URL (or SEPOLIA_RPC_URL)");
  }

  const contractAddress = getRequiredEnv("QUERY_LOG_CONTRACT_ADDRESS");
  const lookbackBlocks = getNumberEnv("CHECK_LOOKBACK_BLOCKS", 20_000);
  const maxEvents = getNumberEnv("CHECK_MAX_EVENTS", 25);

  const provider = new JsonRpcProvider(rpcUrl);
  const contract = new Contract(contractAddress, ABI, provider);

  const [network, latestBlock, logger, totalBuckets] = await Promise.all([
    provider.getNetwork(),
    provider.getBlockNumber(),
    contract.logger() as Promise<string>,
    contract.totalBuckets() as Promise<bigint>
  ]);

  console.log("PrivateQueryLog state");
  console.log(`- network chainId: ${network.chainId.toString()}`);
  console.log(`- latest block: ${latestBlock}`);
  console.log(`- contract: ${contractAddress}`);
  console.log(`- logger: ${logger}`);
  console.log(`- totalBuckets: ${totalBuckets.toString()}`);

  const fromBlock = Math.max(0, latestBlock - lookbackBlocks);
  const filter = contract.filters.QueryBucketIncremented();
  const events = await contract.queryFilter(filter, fromBlock, latestBlock);

  console.log(`- events scanned: ${events.length} (from block ${fromBlock})`);

  if (events.length === 0) {
    console.log("\nNo QueryBucketIncremented events found in scan range.");
    return;
  }

  const recent = events.slice(-maxEvents);
  console.log(`\nRecent ${recent.length} QueryBucketIncremented events:`);

  for (const event of recent) {
    const args = event.args as { userBucketId?: string } | undefined;
    console.log(
      `- block=${event.blockNumber} tx=${event.transactionHash} bucket=${args?.userBucketId ?? "<missing>"}`
    );
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`check-contract-state failed: ${message}`);
  process.exit(1);
});
