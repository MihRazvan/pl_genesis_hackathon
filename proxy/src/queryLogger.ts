import { Contract, JsonRpcProvider, Wallet, isAddress, Transaction } from "ethers";
import type { FastifyBaseLogger } from "fastify";
import type { JsonRpcRequest } from "./jsonRpc.js";

export type QueryLogger = {
  logRequest(payload: JsonRpcRequest): void;
};

type LoggerConfig = {
  enabled: boolean;
  rpcUrl?: string;
  privateKey?: string;
  contractAddress?: string;
  confirmations: number;
};

const PRIVATE_QUERY_LOG_ABI = [
  "function incrementQueryCountFor(address user, uint32 delta)"
];

class NoopQueryLogger implements QueryLogger {
  logRequest(): void {
    // no-op
  }
}

class OnchainQueryLogger implements QueryLogger {
  private readonly contract: Contract;
  private readonly loggerAddress: string;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly log: FastifyBaseLogger,
    rpcUrl: string,
    privateKey: string,
    contractAddress: string,
    private readonly confirmations: number
  ) {
    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);
    this.loggerAddress = wallet.address;
    this.contract = new Contract(contractAddress, PRIVATE_QUERY_LOG_ABI, wallet);
  }

  logRequest(payload: JsonRpcRequest): void {
    const user = extractUserAddress(payload) ?? this.loggerAddress;

    this.queue = this.queue
      .then(async () => {
        const tx = await this.contract.incrementQueryCountFor(user, 1);
        this.log.info({ user, method: payload.method, txHash: tx.hash }, "Queued on-chain query log");

        if (this.confirmations > 0) {
          await tx.wait(this.confirmations);
          this.log.info({ txHash: tx.hash, confirmations: this.confirmations }, "On-chain query log confirmed");
        }
      })
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        this.log.error({ error: reason, method: payload.method, user }, "Failed to write on-chain query log");
      });
  }

  getAddress(): string {
    return this.loggerAddress;
  }
}

function resolveBoolean(rawValue: string | undefined, fallback: boolean): boolean {
  if (rawValue === undefined) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${rawValue}`);
}

function resolveLoggerConfigFromEnv(): LoggerConfig {
  const enabled = resolveBoolean(process.env.QUERY_LOG_ENABLED, false);
  const confirmations = Number(process.env.QUERY_LOG_CONFIRMATIONS ?? 0);

  if (!Number.isInteger(confirmations) || confirmations < 0 || confirmations > 10) {
    throw new Error("Invalid QUERY_LOG_CONFIRMATIONS value");
  }

  return {
    enabled,
    rpcUrl: process.env.QUERY_LOG_RPC_URL,
    privateKey: process.env.QUERY_LOG_PRIVATE_KEY,
    contractAddress: process.env.QUERY_LOG_CONTRACT_ADDRESS,
    confirmations
  };
}

function extractUserAddress(payload: JsonRpcRequest): string | undefined {
  const params = payload.params;
  if (!Array.isArray(params)) {
    return undefined;
  }

  const first = params[0];

  if (typeof first === "string" && isAddress(first)) {
    return first;
  }

  if (payload.method === "eth_call" && first && typeof first === "object") {
    const from = (first as Record<string, unknown>).from;
    if (typeof from === "string" && isAddress(from)) {
      return from;
    }
  }

  if (payload.method === "eth_sendRawTransaction" && typeof first === "string") {
    try {
      const tx = Transaction.from(first);
      if (tx.from && isAddress(tx.from)) {
        return tx.from;
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function createQueryLogger(log: FastifyBaseLogger): QueryLogger {
  const config = resolveLoggerConfigFromEnv();

  if (!config.enabled) {
    return new NoopQueryLogger();
  }

  if (!config.rpcUrl || !config.privateKey || !config.contractAddress) {
    throw new Error(
      "QUERY_LOG_ENABLED=true requires QUERY_LOG_RPC_URL, QUERY_LOG_PRIVATE_KEY, and QUERY_LOG_CONTRACT_ADDRESS"
    );
  }

  if (!isAddress(config.contractAddress)) {
    throw new Error("Invalid QUERY_LOG_CONTRACT_ADDRESS");
  }

  const onchainLogger = new OnchainQueryLogger(
    log,
    config.rpcUrl,
    config.privateKey,
    config.contractAddress,
    config.confirmations
  );

  log.info(
    {
      contractAddress: config.contractAddress,
      loggerAddress: onchainLogger.getAddress(),
      confirmations: config.confirmations,
      rpcUrl: config.rpcUrl
    },
    "On-chain query logging enabled"
  );

  return onchainLogger;
}
