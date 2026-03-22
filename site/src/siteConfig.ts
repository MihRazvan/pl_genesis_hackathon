function getStringEnv(name: string, fallback: string): string {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getBooleanEnv(name: string, fallback: boolean): boolean {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

function getDecimalChainId(name: string, fallback: string): string {
  const value = getStringEnv(name, fallback);
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : fallback;
}

function toHexChainId(decimalChainId: string): string {
  return `0x${Number(decimalChainId).toString(16)}`;
}

const chainId = getDecimalChainId("VITE_CHAIN_ID", "11155111");
const chainName = getStringEnv("VITE_CHAIN_NAME", "Sepolia via Cloakline");
const rpcUrl = getStringEnv("VITE_RPC_URL", "https://rpc.cloakline.xyz/sepolia");
const currencyName = getStringEnv("VITE_CURRENCY_NAME", "Sepolia Ether");
const currencySymbol = getStringEnv("VITE_CURRENCY_SYMBOL", "ETH");
const explorerUrl = getStringEnv("VITE_BLOCK_EXPLORER_URL", "https://sepolia.etherscan.io");

export const siteConfig = {
  rpc: {
    chainId,
    chainIdHex: toHexChainId(chainId),
    chainName,
    rpcUrl,
    currencyName,
    currencySymbol,
    explorerUrl
  },
  isPlaceholderRpc: getBooleanEnv("VITE_RPC_PLACEHOLDER", true)
};

export const manualFields = [
  { label: "Network Name", value: chainName },
  { label: "New RPC URL", value: rpcUrl },
  { label: "Chain ID", value: chainId },
  { label: "Currency Symbol", value: currencySymbol },
  { label: "Block Explorer URL", value: explorerUrl }
];

