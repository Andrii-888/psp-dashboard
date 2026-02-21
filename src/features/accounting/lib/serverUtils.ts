import { headers } from "next/headers";
import type { AccountingEntryRaw } from "./types";

export function mergePipelineWithLedger(
  pipeline: AccountingEntryRaw[],
  ledger: AccountingEntryRaw[]
): AccountingEntryRaw[] {
  const norm = (v: unknown) => String(v ?? "").trim();

  /**
   * Entry-level deterministic key.
   * IMPORTANT:
   * - no `any`
   * - no optional fields unless they exist in the type
   */
  const entryKey = (e: AccountingEntryRaw): string => {
    const invoiceId = norm(e.invoiceId);
    const eventType = norm(e.eventType);
    const createdAt = norm(e.createdAt);

    // Base key: invoice + event
    if (invoiceId && eventType) {
      return `inv:${invoiceId}|ev:${eventType}`;
    }

    // Fallback: event + time (still deterministic)
    return `ev:${eventType || "unknown"}|at:${createdAt}`;
  };

  /**
   * Ledger has priority.
   * Pipeline entries are included ONLY if the same entry
   * does not already exist in ledger.
   */
  const ledgerKeys = new Set<string>();
  for (const e of ledger) {
    ledgerKeys.add(entryKey(e));
  }

  const merged: AccountingEntryRaw[] = [];

  // 1) ledger first (source of truth)
  for (const e of ledger) merged.push(e);

  // 2) pipeline only missing entries
  for (const p of pipeline) {
    const k = entryKey(p);
    if (ledgerKeys.has(k)) continue;
    merged.push(p);
  }

  // 3) sort newest first
  merged.sort((a, b) => {
    const ta = Date.parse(String(a.createdAt ?? "")) || 0;
    const tb = Date.parse(String(b.createdAt ?? "")) || 0;
    return tb - ta;
  });

  return merged;
}

export function toFetchHeaders(
  h: Awaited<ReturnType<typeof headers>>
): Headers {
  const out = new Headers();
  for (const [k, v] of h.entries()) out.set(k, v);
  return out;
}

export function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}
