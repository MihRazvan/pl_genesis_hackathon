import { Contract, JsonRpcProvider, Transaction, Wallet, isAddress } from "ethers";
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
  flushMs: number;
  batchMax: number;
  methods: string[];
};

const PRIVATE_QUERY_LOG_ABI = ["function incrementQueryCountFor(address user, uint32 delta)"];

const DEFAULT_METHODS = ["eth_sendRawTransaction", "eth_getTransactionReceipt", "eth_getTransactionCount"];

class NoopQueryLogger implements QueryLogger {
  logRequest(): void {
    // no-op
  }
}

class OnchainQueryLogger implements QueryLogger {
  private readonly contract: Contract;
  private readonly loggerAddress: string;
  private readonly methodAllowlist: Set<string>;
  private readonly pendingByUser = new Map<string, number>();

  private pendingTotal = 0;
  private flushTimer: NodeJS.Timeout | undefined;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly log: FastifyBaseLogger,
    rpcUrl: string,
    privateKey: string,
    contractAddress: string,
    private readonly confirmations: number,
    private readonly flushMs: number,
    private readonly batchMax: number,
    methods: string[]
  ) {
    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);
    this.loggerAddress = wallet.address;
    this.contract = new Contract(contractAddress, PRIVATE_QUERY_LOG_ABI, wallet);
    this.methodAllowlist = new Set(methods);
  }

  logRequest(payload: JsonRpcRequest): void {
    const method = payload.method ?? "unknown";

    if (!this.methodAllowlist.has(method)) {
      return;
    }

    const user = extractUserAddress(payload) ?? this.loggerAddress;
    const current = this.pendingByUser.get(user) ?? 0;
    const next = Math.min(current + 1, 0xffffffff);

    this.pendingByUser.set(user, next);
    this.pendingTotal += 1;

    if (this.pendingTotal >= this.batchMax) {
      this.flushNow();
      return;
    }

    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushNow();
      }, this.flushMs);
      this.flushTimer.unref?.();
    }
  }

  getAddress(): string {
    return this.loggerAddress;
  }

  getAllowedMethods(): string[] {
    return Array.from(this.methodAllowlist);
  }

  private flushNow(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    if (this.pendingByUser.size === 0) {
      return;
    }

    const batch = Array.from(this.pendingByUser.entries());
    this.pendingByUser.clear();
    this.pendingTotal = 0;

    this.queue = this.queue
      .then(async () => {
        for (const [user, delta] of batch) {
          try {
            const tx = await this.contract.incrementQueryCountFor(user, delta);
            this.log.info({ user, delta, txHash: tx.hash }, "Queued batched on-chain query log");

            if (this.confirmations > 0) {
              await tx.wait(this.confirmations);
              this.log.info({ txHash: tx.hash, confirmations: this.confirmations }, "On-chain query log confirmed");
            }
          } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : String(error);
            this.log.error({ error: reason, user, delta }, "Failed to write batched on-chain query log");
          }
        }
      })
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        this.log.error({ error: reason }, "Unexpected query logger queue failure");
      });
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

function resolveInteger(rawValue: string | undefined, fallback: number, min: number, max: number, name: string): number {
  const value = Number(rawValue ?? fallback);

  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Invalid ${name} value`);
  }

  return value;
}

function resolveCsv(rawValue: string | undefined, fallback: string[]): string[] {
  const values = (rawValue ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length > 0 ? values : fallback;
}

function resolveLoggerConfigFromEnv(): LoggerConfig {
  const enabled = resolveBoolean(process.env.QUERY_LOG_ENABLED, false);
  const confirmations = resolveInteger(process.env.QUERY_LOG_CONFIRMATIONS, 0, 0, 10, "QUERY_LOG_CONFIRMATIONS");
  const flushMs = resolveInteger(process.env.QUERY_LOG_FLUSH_MS, 5000, 250, 60000, "QUERY_LOG_FLUSH_MS");
  const batchMax = resolveInteger(process.env.QUERY_LOG_BATCH_MAX, 20, 1, 500, "QUERY_LOG_BATCH_MAX");
  const methods = resolveCsv(process.env.QUERY_LOG_METHODS, DEFAULT_METHODS);

  return {
    enabled,
    rpcUrl: process.env.QUERY_LOG_RPC_URL,
    privateKey: process.env.QUERY_LOG_PRIVATE_KEY,
    contractAddress: process.env.QUERY_LOG_CONTRACT_ADDRESS,
    confirmations,
    flushMs,
    batchMax,
    methods
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
    config.confirmations,
    config.flushMs,
    config.batchMax,
    config.methods
  );

  log.info(
    {
      contractAddress: config.contractAddress,
      loggerAddress: onchainLogger.getAddress(),
      confirmations: config.confirmations,
      flushMs: config.flushMs,
      batchMax: config.batchMax,
      methods: onchainLogger.getAllowedMethods(),
      rpcUrl: config.rpcUrl
    },
    "On-chain query logging enabled"
  );

  return onchainLogger;
}
