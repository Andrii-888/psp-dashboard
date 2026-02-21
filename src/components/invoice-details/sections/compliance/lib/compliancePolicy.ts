import type { Invoice, DecisionStatus, SanctionsStatus } from "@/lib/pspApi";

export type AmountTier = "small" | "medium" | "large";

export type SuggestedDecision = {
  status: Exclude<DecisionStatus, null>;
  reasonCode: string;
  summary: string;
};

export function formatFiatChf(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} CHF`;
}

export function getAmountTier(fiatAmount: number): AmountTier {
  // Policy tiers (internal workflow), not legal thresholds.
  if (fiatAmount < 500) return "small";
  if (fiatAmount < 2000) return "medium";
  return "large";
}

export function isInvoiceClosed(status: Invoice["status"]): boolean {
  // In this UI we treat these as immutable end-states for compliance actions.
  return (
    status === "confirmed" || status === "expired" || status === "rejected"
  );
}

export function suggestedDecision(invoice: Invoice): SuggestedDecision {
  const aml = invoice.amlStatus ?? null;
  const sanctions: SanctionsStatus = invoice.sanctions?.status ?? null;
  const tier = getAmountTier(invoice.fiatAmount);

  if (sanctions === "hit") {
    return {
      status: "reject",
      reasonCode: "SANCTIONS_HIT",
      summary:
        "Sanctions hit detected. Transaction must be rejected and escalated.",
    };
  }

  if (aml === "blocked") {
    return {
      status: "reject",
      reasonCode: "AML_BLOCKED",
      summary: "AML status is BLOCKED. Transaction must be rejected.",
    };
  }

  if (aml === "risky") {
    return {
      status: "reject",
      reasonCode: "AML_HIGH_RISK",
      summary: "High-risk AML result. Reject by policy.",
    };
  }

  if (aml === "warning") {
    return {
      status: "hold",
      reasonCode: "AML_WARNING_HOLD",
      summary: "AML warning. Hold for enhanced screening / manual review.",
    };
  }

  // aml clean / null:
  if (tier === "large") {
    return {
      status: "hold",
      reasonCode: "TIER2_LARGE_AMOUNT",
      summary: "Large amount tier. Hold for manual review (comment required).",
    };
  }

  return {
    status: "approve",
    reasonCode: tier === "small" ? "TIER0_AUTO_APPROVE" : "TIER1_APPROVE",
    summary: "Low/medium amount with no risk flags. Approve is allowed.",
  };
}

export function decisionPillClass(kind: "approve" | "hold" | "reject"): string {
  switch (kind) {
    case "approve":
      return "border-emerald-500/50 bg-emerald-500/10 text-emerald-100";
    case "hold":
      return "border-amber-500/50 bg-amber-500/10 text-amber-100";
    case "reject":
      return "border-rose-500/60 bg-rose-500/10 text-rose-100";
  }
}

export function decisionButtonClass(
  kind: "approve" | "hold" | "reject"
): string {
  switch (kind) {
    case "approve":
      return "border-emerald-500/60 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20";
    case "hold":
      return "border-amber-500/60 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20";
    case "reject":
      return "border-rose-500/70 bg-rose-500/12 text-rose-100 hover:bg-rose-500/20";
  }
}
