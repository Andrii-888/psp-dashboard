"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useInvoiceDetails } from "@/features/invoices/hooks/useInvoiceDetails";
import { StatusBadge } from "@/shared/ui/invoices/StatusBadge";
import { AmlBadge } from "@/shared/ui/invoices/AmlBadge";
import { formatDateTimeCH } from "@/shared/lib/formatters";

type RouteParams = { id?: string | string[] };

function fmtMoney(
  amount: number | null | undefined,
  ccy: string | null | undefined
) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  const cur = (ccy ?? "").trim();
  if (!cur) return amount.toFixed(2);
  return `${amount.toFixed(2)} ${cur}`;
}

function fmtTs(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return s ? formatDateTimeCH(s) : "—";
}

function buildReceiptText(inv: {
  id: string;
  status?: string | null;
  txStatus?: string | null;
  createdAt?: string | null;
  confirmedAt?: string | null;
  fiatAmount?: number | null;
  fiatCurrency?: string | null;
  cryptoAmount?: number | null;
  cryptoCurrency?: string | null;
  network?: string | null;
  walletAddress?: string | null;
  txHash?: string | null;
  confirmations?: number | null;
  requiredConfirmations?: number | null;
  amlStatus?: string | null;
  riskScore?: number | null;
  decisionStatus?: string | null;
  decisionReasonText?: string | null;
}) {
  const lines: string[] = [];
  lines.push("PAYMENT RECORD");
  lines.push("—");
  lines.push(`Invoice: ${inv.id}`);
  lines.push(`Status: ${(inv.status ?? "—").toString()}`);
  lines.push(`Tx Status: ${(inv.txStatus ?? "—").toString()}`);
  lines.push(`Created: ${fmtTs(inv.createdAt ?? null)}`);
  lines.push(`Confirmed: ${fmtTs(inv.confirmedAt ?? null)}`);
  lines.push("—");
  lines.push(
    `Fiat: ${fmtMoney(inv.fiatAmount ?? null, inv.fiatCurrency ?? null)}`
  );
  lines.push(
    `Crypto: ${fmtMoney(inv.cryptoAmount ?? null, inv.cryptoCurrency ?? null)}`
  );
  lines.push(`Network: ${(inv.network ?? "—").toString()}`);
  lines.push("—");
  lines.push(`Wallet: ${(inv.walletAddress ?? "—").toString()}`);
  lines.push(`TxHash: ${(inv.txHash ?? "—").toString()}`);
  lines.push(
    `Confirmations: ${String(inv.confirmations ?? 0)} / ${String(
      inv.requiredConfirmations ?? 1
    )}`
  );
  lines.push("—");
  lines.push(`AML: ${(inv.amlStatus ?? "—").toString()}`);
  lines.push(
    `Risk Score: ${
      typeof inv.riskScore === "number" ? String(inv.riskScore) : "—"
    }`
  );
  lines.push(`Decision: ${(inv.decisionStatus ?? "—").toString()}`);
  if (inv.decisionReasonText) lines.push(`Reason: ${inv.decisionReasonText}`);
  return lines.join("\n");
}

export default function PaymentRecordPage() {
  const router = useRouter();
  const params = useParams<RouteParams>();

  const idParam = params?.id;
  const invoiceId =
    typeof idParam === "string"
      ? idParam
      : Array.isArray(idParam)
      ? idParam[0] ?? null
      : null;

  useEffect(() => {
    if (!invoiceId) router.replace("/invoices");
  }, [invoiceId, router]);

  const { invoice, loading, error } = useInvoiceDetails(invoiceId);

  const receipt = useMemo(() => {
    if (!invoice?.id) return null;

    return buildReceiptText({
      id: invoice.id,
      status: invoice.status ?? null,
      txStatus:
        (invoice as unknown as { txStatus?: string | null }).txStatus ?? null,
      createdAt:
        (invoice as unknown as { createdAt?: string | null }).createdAt ?? null,
      confirmedAt:
        (invoice as unknown as { confirmedAt?: string | null }).confirmedAt ??
        null,
      fiatAmount:
        (invoice as unknown as { fiatAmount?: number | null }).fiatAmount ??
        null,
      fiatCurrency:
        (invoice as unknown as { fiatCurrency?: string | null }).fiatCurrency ??
        null,
      cryptoAmount:
        (invoice as unknown as { cryptoAmount?: number | null }).cryptoAmount ??
        null,
      cryptoCurrency:
        (invoice as unknown as { cryptoCurrency?: string | null })
          .cryptoCurrency ?? null,
      network:
        (invoice as unknown as { network?: string | null }).network ?? null,
      walletAddress:
        (invoice as unknown as { walletAddress?: string | null })
          .walletAddress ?? null,
      txHash: (invoice as unknown as { txHash?: string | null }).txHash ?? null,
      confirmations:
        (invoice as unknown as { confirmations?: number | null })
          .confirmations ?? null,
      requiredConfirmations:
        (invoice as unknown as { requiredConfirmations?: number | null })
          .requiredConfirmations ?? null,
      amlStatus:
        (invoice as unknown as { amlStatus?: string | null }).amlStatus ?? null,
      riskScore:
        (invoice as unknown as { riskScore?: number | null }).riskScore ?? null,
      decisionStatus:
        (invoice as unknown as { decisionStatus?: string | null })
          .decisionStatus ?? null,
      decisionReasonText:
        (invoice as unknown as { decisionReasonText?: string | null })
          .decisionReasonText ?? null,
    });
  }, [invoice]);

  if (!invoiceId) return null;

  if (!loading && !invoice) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-page-gradient px-4 py-6 text-slate-50 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:gap-6">
        <section className="apple-card px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">
                Payment Record
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                Copyable receipt-style record for sharing / audit.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  router.push(`/invoices/${encodeURIComponent(invoiceId)}`)
                }
                className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-500/60"
              >
                Back to Invoice
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!receipt) return;
                  try {
                    await navigator.clipboard.writeText(receipt);
                  } catch {
                    // ignore
                  }
                }}
                className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-500/60"
              >
                Copy
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="apple-card px-4 py-4 md:px-6">
            <div className="text-xs text-rose-300">Failed to load invoice</div>
            <div className="mt-1 text-[11px] text-slate-500">{error}</div>
          </section>
        ) : null}

        <section className="apple-card px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-slate-500">Invoice</div>
              <div className="mt-1 mx-auto max-w-2xl truncate font-mono text-[11px] text-slate-100">
                {invoiceId}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={invoice?.status ?? "waiting"} />
              <AmlBadge
                amlStatus={
                  (invoice as unknown as { amlStatus?: string | null })
                    ?.amlStatus ?? null
                }
                riskScore={
                  (invoice as unknown as { riskScore?: number | null })
                    ?.riskScore ?? null
                }
                assetStatus={
                  (invoice as unknown as { assetStatus?: string | null })
                    ?.assetStatus ?? null
                }
                assetRiskScore={
                  (invoice as unknown as { assetRiskScore?: number | null })
                    ?.assetRiskScore ?? null
                }
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800/70 bg-slate-950/50 p-3">
            <div className="mb-2 text-[11px] font-semibold text-slate-200">
              Receipt (copyable)
            </div>

            <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-slate-200">
              {receipt ?? (loading ? "Loading…" : "—")}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
