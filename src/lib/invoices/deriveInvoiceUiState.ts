import type { Invoice, UiBadgeTone } from "@/domain/invoices/types";

export type UiAxis = {
  tone: UiBadgeTone;
  label: string;
  details?: string | null;
};

export type InvoiceUiState = {
  invoice: UiAxis;
  tx: UiAxis;
  decision: UiAxis;

  needsDecision: boolean;
  nextAction: "approve" | "hold" | "reject" | "none";
  reason?: string | null;
};

function toneOk(): UiBadgeTone {
  return "ok";
}
function toneWarn(): UiBadgeTone {
  return "warn";
}
function toneError(): UiBadgeTone {
  return "error";
}

function hasNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function normalizeInt(v: number | null | undefined): number | null {
  return hasNumber(v) ? Math.max(0, Math.floor(v)) : null;
}

const SLA_MS = 25 * 60 * 1000;

function safeDateMs(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function slaLabel(msLeft: number): { label: string; tone: UiBadgeTone } {
  if (msLeft <= 0) {
    const overdueMin = Math.ceil(Math.abs(msLeft) / 60000);
    return { label: `overdue ${overdueMin}m`, tone: toneError() };
  }

  const minLeft = Math.ceil(msLeft / 60000);
  if (minLeft <= 5) return { label: `due in ${minLeft}m`, tone: toneWarn() };
  return { label: `due in ${minLeft}m`, tone: toneOk() };
}

function txFinalityLabel(
  confirmations: number | null,
  required: number | null
): { label: string; tone: UiBadgeTone; details?: string } {
  if (confirmations === null && required === null) {
    return {
      label: "No TX",
      tone: toneWarn(),
      details: "No confirmations data",
    };
  }

  const c = confirmations ?? 0;
  const r = required ?? 0;

  if (r <= 0) {
    // We know confirmations but don't know target -> treat as "in progress"
    return {
      label: `TX ${c} conf`,
      tone: c > 0 ? toneWarn() : toneWarn(),
      details: "Required confirmations unknown",
    };
  }

  if (c >= r) {
    return {
      label: `Final (${c}/${r})`,
      tone: toneOk(),
      details: "Sufficient confirmations",
    };
  }

  return {
    label: `Confirming (${c}/${r})`,
    tone: c > 0 ? toneWarn() : toneWarn(),
    details: "Waiting for finality",
  };
}

function decisionAxis(invoice: Invoice): UiAxis & { needsDecision: boolean } {
  const needsDecision =
    Boolean(invoice.ui?.needsDecision) ||
    (invoice.decisionStatus == null &&
      (invoice.amlStatus === "review" ||
        invoice.amlStatus === "warning" ||
        invoice.amlStatus === "risky" ||
        invoice.amlStatus === "blocked"));

  // If decision already made
  if (invoice.decisionStatus) {
    const tone =
      invoice.decisionStatus === "approve"
        ? toneOk()
        : invoice.decisionStatus === "hold"
        ? toneWarn()
        : toneError();

    const who = invoice.decidedBy ? `by ${invoice.decidedBy}` : null;
    const when = invoice.decidedAt ? invoice.decidedAt : null;

    return {
      label: `Decision: ${invoice.decisionStatus.toUpperCase()}`,
      tone,
      details: [who, when].filter(Boolean).join(" · ") || null,
      needsDecision: false,
    };
  }
  if (needsDecision) {
    const provider = invoice.amlProvider ?? "AML";
    const risk =
      invoice.riskScore != null ? `risk ${invoice.riskScore}` : "risk —";

    const dueAtMs =
      safeDateMs(invoice.decisionDueAt ?? null) ??
      (() => {
        const base = safeDateMs(
          invoice.amlCheckedAt ?? invoice.detectedAt ?? null
        );
        return base ? base + SLA_MS : null;
      })();

    const sla = dueAtMs ? slaLabel(dueAtMs - Date.now()) : null;

    return {
      label: "Decision required",
      tone: sla?.tone ?? toneWarn(),
      details: [provider, risk, sla?.label ?? null].filter(Boolean).join(" · "),
      needsDecision: true,
    };
  }

  // No decision and not required
  if (invoice.amlStatus) {
    // AML completed, but no decision required
    const tone =
      invoice.amlStatus === "clean"
        ? toneOk()
        : invoice.amlStatus === "warning"
        ? toneWarn()
        : invoice.amlStatus === "review"
        ? toneWarn()
        : invoice.amlStatus === "risky"
        ? toneError()
        : invoice.amlStatus === "blocked"
        ? toneError()
        : toneWarn();

    const provider = invoice.amlProvider ?? "AML";
    return {
      label: "No decision",
      tone,
      details: `${provider} · ${invoice.amlStatus}`,
      needsDecision: false,
    };
  }

  return {
    label: "No AML yet",
    tone: toneWarn(),
    details: null,
    needsDecision: false,
  };
}

function invoiceAxis(invoice: Invoice): UiAxis {
  if (invoice.status === "confirmed") {
    return {
      label: "Invoice: CONFIRMED",
      tone: toneOk(),
      details: invoice.confirmedAt ?? null,
    };
  }
  if (invoice.status === "expired") {
    return {
      label: "Invoice: EXPIRED",
      tone: toneWarn(),
      details: invoice.expiresAt ?? null,
    };
  }
  if (invoice.status === "rejected") {
    return {
      label: "Invoice: REJECTED",
      tone: toneError(),
      details: invoice.decidedAt ?? null,
    };
  }
  // waiting
  return {
    label: "Invoice: WAITING",
    tone: toneWarn(),
    details: invoice.expiresAt ?? null,
  };
}

function txAxis(invoice: Invoice): UiAxis {
  const confirmations = normalizeInt(invoice.confirmations);
  const required = normalizeInt(invoice.requiredConfirmations);

  // If there is no txHash yet
  if (!invoice.txHash) {
    return {
      label: "TX: NONE",
      tone: toneWarn(),
      details: "No txHash attached",
    };
  }

  // If invoice has explicit txStatus
  if (invoice.txStatus) {
    // treat "confirmed" as ok, "detected/pending" as warn, others -> warn by default
    const lowered = invoice.txStatus.toLowerCase();
    const baseTone = lowered.includes("confirm")
      ? toneOk()
      : lowered.includes("fail")
      ? toneError()
      : toneWarn();

    const fin = txFinalityLabel(confirmations, required);
    const label = `TX: ${invoice.txStatus.toUpperCase()}`;
    const details = fin.label;

    // if fin says ok, prefer ok even if txStatus is detected/pending
    const tone = fin.tone === "ok" ? toneOk() : baseTone;

    return { label, tone, details };
  }

  // No txStatus -> derive from confirmations
  const fin = txFinalityLabel(confirmations, required);
  return { label: "TX", tone: fin.tone, details: fin.label };
}

function nextActionFromState(s: InvoiceUiState): InvoiceUiState["nextAction"] {
  if (!s.needsDecision) return "none";

  // If decision required and AML is high risk -> default to HOLD (operator decides)
  const t = s.decision.details ?? "";
  const highRisk = t.includes("risky") || t.includes("blocked");
  return highRisk ? "hold" : "approve";
}

/**
 * SSOT: derive all operator-facing statuses + next action from invoice.
 * All UI should read only this output (not re-derive in components).
 */
export function deriveInvoiceUiState(invoice: Invoice): InvoiceUiState {
  const invoiceA = invoiceAxis(invoice);
  const txA = txAxis(invoice);

  const dec = decisionAxis(invoice);
  const needsDecision = dec.needsDecision;

  const base: InvoiceUiState = {
    invoice: invoiceA,
    tx: txA,
    decision: {
      label: dec.label,
      tone: dec.tone,
      details: dec.details ?? null,
    },
    needsDecision,
    nextAction: "none",
    reason: invoice.decisionReasonText ?? invoice.decisionReasonCode ?? null,
  };

  return { ...base, nextAction: nextActionFromState(base) };
}
