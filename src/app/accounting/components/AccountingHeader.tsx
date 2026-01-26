//src/app/accounting/components/AccountingHeader.tsx
import Link from "next/link";
import ExportCsvButton from "../actions/ExportCsvButton";

export default function AccountingHeader({
  merchantId,
  limit,
  rows,
  hasNonChf,
}: {
  merchantId: string;
  limit: number;
  rows: number;
  hasNonChf: boolean;
}) {
  const rowsValueClass = rows > 0 ? "text-emerald-300" : "text-amber-300";

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      {/* Left: back + title */}
      <div>
        <Link
          href="/invoices"
          className="mb-1 inline-flex items-center text-sm text-slate-400 hover:text-slate-200 hover:underline"
        >
          ← Back to invoices
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Accounting
        </h1>

        {/* Context line */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
          <span>
            <span className="text-slate-500">merchantId:</span>{" "}
            <span className="font-mono text-slate-200">{merchantId}</span>
          </span>

          <span className="text-slate-600">•</span>

          <span>
            <span className="text-slate-500">limit:</span>{" "}
            <span className="font-mono text-sky-200">{limit}</span>
          </span>

          <span className="text-slate-600">•</span>

          <span>
            <span className="text-slate-500">rows:</span>{" "}
            <span className={`font-mono ${rowsValueClass}`}>{rows}</span>
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {hasNonChf ? (
          <span className="inline-flex items-center rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
            Non-CHF hidden
          </span>
        ) : null}

        <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          CHF-only
        </span>

        <ExportCsvButton />
      </div>
    </div>
  );
}
