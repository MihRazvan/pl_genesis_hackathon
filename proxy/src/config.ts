const DEFAULT_UPSTREAM_URLS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://eth-sepolia-testnet.api.pocket.network"
];

export function resolveUpstreamUrls(rawValue = process.env.UPSTREAM_RPC_URLS): string[] {
  const parsed = (rawValue ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  const urls = parsed.length > 0 ? parsed : DEFAULT_UPSTREAM_URLS;

  urls.forEach((url) => {
    try {
      const parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Unsupported protocol");
      }
    } catch {
      throw new Error(`Invalid upstream RPC URL: ${url}`);
    }
  });

  return urls;
}

export function resolvePort(rawValue = process.env.PORT): number {
  const value = Number(rawValue ?? 8547);
  if (!Number.isInteger(value) || value <= 0 || value > 65535) {
    throw new Error(`Invalid PORT value: ${rawValue}`);
  }
  return value;
}

export function resolveTimeoutMs(rawValue = process.env.REQUEST_TIMEOUT_MS): number {
  const value = Number(rawValue ?? 10_000);
  if (!Number.isInteger(value) || value < 500 || value > 120_000) {
    throw new Error(`Invalid REQUEST_TIMEOUT_MS value: ${rawValue}`);
  }
  return value;
}
