
import type { Asset, Network } from "./types";

type ExplorerKind = "tx" | "address";

const TRONSCAN_BASE = "https://tronscan.org/#";
const ETHERSCAN_BASE = "https://etherscan.io";

function isNonEmpty(v?: string | null): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeNetwork(n?: string | null): Network | null {
  if (!n) return null;
  const v = String(n).toUpperCase().trim();
  if (v === "TRON") return "TRON";
  if (v === "ETHEREUM" || v === "ETH") return "ETHEREUM";
  return null;
}

/**
 * Strict v1 rule:
 * USDT -> TRON
 * USDC -> ETHEREUM
 */
export function isAllowedPair(asset?: Asset | null, network?: Network | null) {
  if (!asset || !network) return false;
  return (
    (asset === "USDT" && network === "TRON") ||
    (asset === "USDC" && network === "ETHEREUM")
  );
}

function buildUrl(network: Network, kind: ExplorerKind, value: string): string {
  if (network === "TRON") {
    // Tronscan uses hash routing
    if (kind === "tx") return `${TRONSCAN_BASE}/transaction/${value}`;
    return `${TRONSCAN_BASE}/address/${value}`;
  }

  // ETHEREUM
  if (kind === "tx") return `${ETHERSCAN_BASE}/tx/${value}`;
  return `${ETHERSCAN_BASE}/address/${value}`;
}

export function getTxUrl(
  networkLike?: string | null,
  txHash?: string | null
): string | null {
  const network = normalizeNetwork(networkLike);
  if (!network || !isNonEmpty(txHash)) return null;
  return buildUrl(network, "tx", txHash.trim());
}

export function getAddressUrl(
  networkLike?: string | null,
  address?: string | null
): string | null {
  const network = normalizeNetwork(networkLike);
  if (!network || !isNonEmpty(address)) return null;
  return buildUrl(network, "address", address.trim());
}
