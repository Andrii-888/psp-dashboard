// src/components/invoice-details/overview/amlUiState.ts
import type { Invoice } from "@/lib/pspApi";

export type AmlUiStage =
  | "no_tx"
  | "not_started"
  | "running"
  | "done"
  | "error"
  | "locked";

export type AmlUiState = {
  stage: AmlUiStage;

  // tx
  hasTx: boolean;
  txHash: string | null;
  txStatus: string | null;

  // aml
  amlStatus: string | null;
  riskScore: number | null;
  assetStatus: string | null;
  assetRiskScore: number | null;
  amlProvider: string | null;
  amlCheckedAt: string | null;
  amlError: string | null;

  // UI strings
  header: string;
  primaryLine: string;
  secondaryLine?: string;
  helper?: string;
};

function cleanStr(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s ? s : null;
}

function cleanNum(v: number | null | undefined): number | null {
  if (typeof v !== "number") return null;
  return Number.isFinite(v) ? v : null;
}

function getRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function getOptionalStringField(obj: unknown, key: string): string | null {
  const rec = getRecord(obj);
  if (!rec) return null;
  const v = rec[key];
  return typeof v === "string" ? cleanStr(v) : null;
}

export function getAmlUiState(invoice: Invoice): AmlUiState {
  const txHash = cleanStr(invoice.txHash ?? null);
  const txStatusRaw = (invoice.txStatus ?? null) as unknown;
  const txStatus = cleanStr(
    typeof txStatusRaw === "string" ? txStatusRaw : null
  );

  const amlStatus = cleanStr(invoice.amlStatus ?? null);
  const amlProvider = getOptionalStringField(invoice, "amlProvider");
  const amlCheckedAt = getOptionalStringField(invoice, "amlCheckedAt");
  const amlError = getOptionalStringField(invoice, "amlError");

  const riskScore = cleanNum(invoice.riskScore ?? null);
  const assetStatus = cleanStr(invoice.assetStatus ?? null);
  const assetRiskScore = cleanNum(invoice.assetRiskScore ?? null);

  const hasTx = Boolean(txHash);

  // locked: invoice не в открытом состоянии (после confirm/expire/reject)
  const status = cleanStr(invoice.status ?? null);
  const locked =
    status !== null && status !== "waiting" && status !== "pending";

  // Stage logic (SSOT)
  let stage: AmlUiStage = "not_started";

  if (!hasTx) {
    stage = "no_tx";
  } else if (amlError) {
    stage = "error";
  } else if (amlStatus) {
    stage = "done";
  } else if (hasTx && !amlCheckedAt) {
    stage = "not_started";
  } else {
    stage = "running";
  }

  if (locked) {
    stage = stage === "done" ? "done" : "locked";
  }

  // Copy
  const header = "AML status";

  let primaryLine = "No AML data";
  let secondaryLine: string | undefined;
  let helper: string | undefined;

  if (stage === "no_tx") {
    primaryLine = "No txHash detected yet.";
    helper = "Waiting for provider / chain detection (or attach tx in demo).";
  }

  if (stage === "not_started") {
    primaryLine = "Screening not started.";
    helper = "Tx detected — you can run AML check.";
  }

  if (stage === "running") {
    primaryLine = "🔍 Running AML / KYT checks…";
    helper = "Funds remain isolated until compliance result is recorded.";
  }

  if (stage === "done") {
    primaryLine =
      amlStatus === "clean"
        ? "AML: clean"
        : amlStatus === "warning"
        ? "AML: warning"
        : amlStatus === "risky"
        ? "AML: high risk"
        : `AML: ${amlStatus}`;

    const provider = amlProvider ?? "—";
    const checked = amlCheckedAt ?? "—";
    secondaryLine = `Provider: ${provider} · checkedAt: ${checked}`;
  }

  if (stage === "error") {
    primaryLine = "AML error";
    helper = amlError ?? "Failed to run AML check.";
  }

  if (stage === "locked") {
    primaryLine = "AML locked (invoice closed)";
    helper =
      "Invoice is not in an open state. AML is informational only for this record.";
  }

  return {
    stage,

    hasTx,
    txHash,
    txStatus,

    amlStatus,
    riskScore,
    assetStatus,
    assetRiskScore,
    amlProvider,
    amlCheckedAt,
    amlError,

    header,
    primaryLine,
    secondaryLine,
    helper,
  };
}
