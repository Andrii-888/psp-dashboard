"use client";

import React from "react";
import type { Invoice } from "../types/invoice";
import { formatDateTimeCH } from "@/shared/lib/formatters";

function upper(v?: string | null): string {
  return (
    String(v ?? "")
      .trim()
      .toUpperCase() || "—"
  );
}

function txt(v?: string | null): string {
  const s = String(v ?? "").trim();
  return s ? s : "—";
}

function fmtUtc(iso?: string | null): string {
  if (!iso) return "—";
  return `${formatDateTimeCH(iso)} UTC`;
}

function Row({
  label,
  value,
  mono = true,
  wrap = false,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  wrap?: boolean;
  tone?: "default" | "muted";
}) {
  const title = typeof value === "string" ? value : undefined;

  return (
    <div className="grid grid-cols-12 gap-3 py-3">
      <div className="col-span-12 text-xs font-medium text-zinc-500 md:col-span-4">
        {label}
      </div>
      <div
        className={[
          "col-span-12 text-sm md:col-span-8",
          tone === "muted" ? "text-zinc-700" : "text-zinc-900",
          mono ? "font-mono text-[13px] tabular-nums" : "",
          wrap
            ? "wrap-break-word"
            : "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap",
        ].join(" ")}
        title={title}
      >
        {value}
      </div>
    </div>
  );
}

function normalizeDecision(invoice: Invoice): {
  status: string;
  reason: string;
  decidedAt: string;
  decidedBy: string;
  raw: string; // lowercased raw decision for logic
} {
  const statusRaw =
    (invoice.decisionStatus != null
      ? invoice.decisionStatus
      : invoice.decision?.status) ?? null;

  const reason =
    invoice.decisionReasonText ??
    invoice.decisionReasonCode ??
    invoice.decision?.reasonCode ??
    invoice.decision?.comment ??
    null;

  const decidedAt = invoice.decidedAt ?? invoice.decision?.decidedAt ?? null;
  const decidedBy = invoice.decidedBy ?? invoice.decision?.decidedBy ?? null;

  const raw = String(statusRaw ?? "")
    .trim()
    .toLowerCase();

  return {
    status: upper(String(statusRaw ?? "")),
    reason: txt(String(reason ?? "")),
    decidedAt: fmtUtc(decidedAt),
    decidedBy: txt(decidedBy),
    raw,
  };
}

export default function Compliance({ invoice }: { invoice: Invoice }) {
  const decision = normalizeDecision(invoice);

  const riskScoreNum =
    typeof invoice.riskScore === "number" ? invoice.riskScore : null;
  const assetRiskScoreNum =
    typeof invoice.assetRiskScore === "number" ? invoice.assetRiskScore : null;

  const riskScore = riskScoreNum !== null ? String(riskScoreNum) : "—";
  const assetRiskScore =
    assetRiskScoreNum !== null ? String(assetRiskScoreNum) : "—";

  const rawAmlStatus = txt(invoice.amlStatus);

  // Accounting logic:
  // If the invoice is CONFIRMED + APPROVED and both scores are 0,
  // treat AML as resolved to avoid false "warning" in accounting receipts.
  const amlStatus =
    (decision.raw === "approve" || decision.raw === "approved") &&
    riskScoreNum === 0 &&
    assetRiskScoreNum === 0
      ? "clean/approved"
      : rawAmlStatus;

  return (
    <section className="mt-4 rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="px-6 py-5">
        <div className="text-sm font-semibold text-zinc-900">Compliance</div>
        <div className="mt-1 text-xs text-zinc-500">
          AML and decision fields for audit requests.
        </div>

        <div className="mt-4 divide-y divide-zinc-100">
          <Row label="AML status" value={amlStatus} />
          <Row label="Risk score" value={riskScore} />
          <Row label="Asset risk score" value={assetRiskScore} />

          <Row label="Decision" value={decision.status} />
          <Row label="Reason" value={decision.reason} mono={false} wrap />
          <Row label="Decided at" value={decision.decidedAt} />
          <Row label="Decided by" value={decision.decidedBy} />
        </div>
      </div>
    </section>
  );
}
