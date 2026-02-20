// src/app/invoices/[id]/page.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useInvoiceDetails } from "@/hooks/useInvoiceDetails";
import { AuditTrailCard } from "@/components/invoice-details/sections/audit-trail";
import { InvoiceHeader } from "@/components/invoice-details/sections/header";
import { OverviewCard } from "@/components/invoice-details/sections/overview";
import { ComplianceDecisionCard } from "@/components/invoice-details/sections/compliance";
import { BlockchainCard } from "@/components/invoice-details/sections/blockchain";
import { WebhooksCard } from "@/components/invoice-details/sections/webhooks";
import { ProviderEventsCard } from "@/components/invoice-details/sections/provider-events";
import {
  DecisionRail,
  OperatorActionsCard,
} from "@/components/invoice-details/sections/operator-actions";

type InvoiceRouteParams = {
  id?: string | string[];
};

type DebugInvoiceSnapshot = {
  id: string | null;
  status: string | null;
  txStatus: string | null;
  walletAddress: string | null;
  txHash: string | null;
  network: string | null;
  payCurrency: string | null;

  amlStatus: string | null;
  riskScore: number | null;

  decisionStatus: string | null;
  decisionReasonCode: string | null;
  decisionReasonText: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickString(o: Record<string, unknown>, key: string): string | null {
  const v = o[key];
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams<InvoiceRouteParams>();

  const idParam = params?.id;
  const invoiceId =
    typeof idParam === "string"
      ? idParam
      : Array.isArray(idParam)
      ? idParam[0] ?? null
      : null;

  const {
    invoice,
    webhooks,
    providerEvents,
    providerEventsLoading,
    loading,
    webhooksLoading,
    dispatching,
    amlLoading,
    savingTx,
    error,
    webhookInfo,
    reloadWebhooks,
    handleDispatchWebhooks,
    handleRunAml,
    handleAttachTx,
    handleConfirm,
    handleReject,
    handleExpire,
    handleApprove,
  } = useInvoiceDetails(invoiceId);

  const sp = useSearchParams();
  const debug = useMemo(() => sp.get("debug") === "1", [sp]);

  const debugSnap = useMemo<DebugInvoiceSnapshot>(() => {
    const base: DebugInvoiceSnapshot = {
      id: invoice?.id ?? invoiceId ?? null,
      status: invoice?.status ?? null,
      txStatus: null,
      walletAddress: null,
      txHash: null,
      network: null,
      payCurrency: null,

      amlStatus: invoice?.amlStatus ?? null,
      riskScore:
        typeof invoice?.riskScore === "number" ? invoice.riskScore : null,

      decisionStatus: invoice?.decisionStatus ?? null,
      decisionReasonCode: null,
      decisionReasonText: null,
      decidedAt: null,
      decidedBy: null,
    };

    if (!isRecord(invoice)) return base;

    return {
      ...base,
      txStatus: pickString(invoice, "txStatus"),
      walletAddress: pickString(invoice, "walletAddress"),
      txHash: pickString(invoice, "txHash"),
      network: pickString(invoice, "network"),
      payCurrency:
        pickString(invoice, "payCurrency") ??
        pickString(invoice, "cryptoCurrency"),
      decisionReasonCode: pickString(invoice, "decisionReasonCode"),
      decisionReasonText: pickString(invoice, "decisionReasonText"),
      decidedAt: pickString(invoice, "decidedAt"),
      decidedBy: pickString(invoice, "decidedBy"),
    };
  }, [invoice, invoiceId]);

  // ⬅️ Back logic
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/invoices");
  };

  // ⬅️ Guard: no id → list
  useEffect(() => {
    if (!invoiceId) router.replace("/invoices");
  }, [invoiceId, router]);

  if (!invoiceId) {
    return (
      <main className="min-h-screen bg-page-gradient px-4 py-6 text-slate-50 md:px-8 md:py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 md:gap-6">
          <section className="apple-card px-4 py-6 md:px-6 md:py-8">
            <p className="text-sm text-slate-200">Invoice ID is missing.</p>
            <p className="mt-1 text-xs text-slate-500">
              Redirecting back to invoices list…
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page-gradient px-4 py-6 text-slate-50 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:gap-6">
        <InvoiceHeader invoice={invoice} onBack={handleBack} />

        {debug && (
          <section className="apple-card px-4 py-4 md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Operator Debug
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Enabled via <span className="font-mono">?debug=1</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      JSON.stringify(debugSnap, null, 2)
                    );
                  } catch {
                    // ignore
                  }
                }}
                className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-500/60"
              >
                Copy JSON
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] md:grid-cols-2">
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3">
                <div className="text-slate-500">Flow</div>
                <div className="mt-1 space-y-1">
                  <div>
                    <span className="text-slate-500">status:</span>{" "}
                    <span className="font-mono text-slate-100">
                      {debugSnap.status ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">txStatus:</span>{" "}
                    <span className="font-mono text-slate-100">
                      {debugSnap.txStatus ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3">
                <div className="text-slate-500">Compliance</div>
                <div className="mt-1 space-y-1">
                  <div>
                    <span className="text-slate-500">amlStatus:</span>{" "}
                    <span className="font-mono text-slate-100">
                      {debugSnap.amlStatus ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">riskScore:</span>{" "}
                    <span className="font-mono text-slate-100">
                      {typeof debugSnap.riskScore === "number"
                        ? debugSnap.riskScore
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">decisionStatus:</span>{" "}
                    <span className="font-mono text-slate-100">
                      {debugSnap.decisionStatus ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3 md:col-span-2">
                <div className="text-slate-500">Transaction</div>
                <div className="mt-1 space-y-1">
                  <div>
                    <span className="text-slate-500">walletAddress:</span>{" "}
                    <span className="break-all font-mono text-slate-100">
                      {debugSnap.walletAddress ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">txHash:</span>{" "}
                    <span className="break-all font-mono text-slate-100">
                      {debugSnap.txHash ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">network:</span>{" "}
                    <span className="font-mono text-slate-100">
                      {debugSnap.network ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">payCurrency:</span>{" "}
                    <span className="font-mono text-slate-100">
                      {debugSnap.payCurrency ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {loading && (
          <section className="apple-card px-4 py-6 md:px-6 md:py-8">
            <p className="text-sm text-slate-400">Loading invoice…</p>
          </section>
        )}

        {!loading && error && (
          <section className="apple-card px-4 py-6 md:px-6 md:py-8">
            <p className="text-sm text-rose-200">{error}</p>
          </section>
        )}

        {!loading && !error && !invoice && (
          <section className="apple-card px-4 py-6 md:px-6 md:py-8">
            <p className="text-sm text-slate-200">Invoice not found.</p>
            <p className="mt-1 text-xs text-slate-500">
              It may have been deleted, expired, or the ID is invalid.
            </p>
          </section>
        )}

        {!loading && !error && invoice && (
          <>
            <OverviewCard
              invoice={invoice}
              onRunAml={handleRunAml}
              amlLoading={amlLoading}
              savingTx={savingTx}
              onAttachTx={handleAttachTx}
            />

            <BlockchainCard
              invoice={invoice}
              savingTx={savingTx}
              onAttachTx={handleAttachTx}
            />

            <ComplianceDecisionCard
              invoice={invoice}
              onDecide={async (payload) => {
                if (process.env.NODE_ENV !== "production") {
                  console.log("COMPLIANCE_DECISION", {
                    invoiceId: invoice.id,
                    ...payload,
                  });
                }
              }}
            />

            <OperatorActionsCard
              invoice={invoice}
              onConfirm={handleConfirm}
              onReject={handleReject}
              onExpire={handleExpire}
            />

            <AuditTrailCard invoice={invoice} />

            <ProviderEventsCard
              events={providerEvents}
              loading={providerEventsLoading}
            />

            <WebhooksCard
              webhooks={webhooks}
              webhookInfo={webhookInfo}
              webhooksLoading={webhooksLoading}
              dispatching={dispatching}
              onReload={reloadWebhooks}
              onDispatch={handleDispatchWebhooks}
            />
          </>
        )}

        {/* Decision Rail */}
        <div className="hidden lg:block fixed top-1/2 -translate-y-1/2 z-40 left-[calc(50%+32rem)] ml-6">
          <DecisionRail
            disabled={!invoice}
            onApprove={handleApprove}
            onReject={() => handleReject()}
            onHold={() => handleExpire()}
          />
        </div>
      </div>
    </main>
  );
}
