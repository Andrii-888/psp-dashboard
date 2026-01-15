// src/app/accounting/components/ReconciliationPanel.tsx

import type { ReconciliationResponse } from "../lib/api";

type Issue = ReconciliationResponse["issues"][number];

type Props = {
  data: ReconciliationResponse | null;

  merchantId?: string;
  limit?: number;
  from?: string;
  to?: string;
  backfillInserted?: string;
  backfillError?: string;
  onBackfill?: (formData: FormData) => Promise<void>;
};

function SeverityPill({ severity }: { severity: Issue["severity"] }) {
  const s = String(severity || "").toLowerCase();

  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

  if (s === "high")
    return (
      <span className={`${base} border-red-200 bg-red-50 text-red-700`}>
        HIGH
      </span>
    );

  if (s === "medium")
    return (
      <span className={`${base} border-amber-200 bg-amber-50 text-amber-700`}>
        MEDIUM
      </span>
    );

  if (s === "low")
    return (
      <span className={`${base} border-zinc-200 bg-zinc-50 text-zinc-700`}>
        LOW
      </span>
    );

  return (
    <span className={`${base} border-zinc-200 bg-white text-zinc-700`}>
      {String(severity || "unknown")}
    </span>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function ReconciliationPanel({
  data,
  merchantId,
  limit,
  from,
  to,
  backfillInserted,
  backfillError,
  onBackfill,
}: Props) {
  const issues = data?.issues ?? [];
  const ok = issues.length === 0;

  const canBackfill =
    typeof onBackfill === "function" &&
    typeof merchantId === "string" &&
    merchantId.length > 0 &&
    typeof limit === "number";

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-zinc-900">
              Reconciliation
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              {data ? (
                <>
                  merchantId:{" "}
                  <span className="font-mono text-zinc-800">
                    {data.merchantId ?? "—"}
                  </span>
                  {from ? (
                    <>
                      {" "}
                      · from:{" "}
                      <span className="font-mono text-zinc-800">{from}</span>
                    </>
                  ) : null}
                  {to ? (
                    <>
                      {" "}
                      · to:{" "}
                      <span className="font-mono text-zinc-800">{to}</span>
                    </>
                  ) : null}
                  {data.checkedAt ? (
                    <>
                      {" "}
                      · checked:{" "}
                      <span className="font-mono text-zinc-800">
                        {fmtDate(data.checkedAt)}
                      </span>
                    </>
                  ) : null}
                </>
              ) : (
                <span>Not available</span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div
              className={
                ok
                  ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
                  : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
              }
            >
              {ok ? "OK" : `Issues: ${issues.length}`}
            </div>

            {canBackfill ? (
              <form action={onBackfill}>
                <input type="hidden" name="merchantId" value={merchantId} />
                <input type="hidden" name="limit" value={String(limit)} />
                <input type="hidden" name="from" value={from ?? ""} />
                <input type="hidden" name="to" value={to ?? ""} />

                <button
                  type="submit"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                  title="Create missing invoice.confirmed accounting entries"
                >
                  Run backfill confirmed
                </button>
              </form>
            ) : null}
          </div>
        </div>

        {backfillInserted ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Backfill completed: inserted{" "}
            <span className="font-semibold">{backfillInserted}</span>.
          </div>
        ) : null}

        {backfillError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Backfill failed:{" "}
            <span className="font-semibold">{backfillError}</span>
          </div>
        ) : null}
      </div>

      <div className="p-4">
        {ok ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            No issues found for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr className="border-b border-zinc-200">
                  <th className="py-2 pr-4">Severity</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Message</th>
                  <th className="py-2 pr-2">Created</th>
                </tr>
              </thead>
              <tbody className="text-zinc-900">
                {issues.map((it, idx) => (
                  <tr
                    key={`${it.type}-${it.invoiceId ?? "—"}-${
                      it.createdAt ?? "—"
                    }-${idx}`}
                    className="border-b border-zinc-100"
                  >
                    <td className="py-3 pr-4">
                      <SeverityPill severity={it.severity} />
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs">{it.type}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs">
                        {it.invoiceId ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-zinc-700">
                      {it.message ?? "—"}
                    </td>
                    <td className="py-3 pr-2 text-zinc-600">
                      {fmtDate(it.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
