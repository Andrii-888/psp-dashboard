import Link from "next/link";

export default function AccountingHeader({
  merchantId,
  limit,
  rows,
}: {
  merchantId: string;
  limit: number;
  rows: number;
}) {
  const csvHref = `/api/psp/accounting/entries.csv?merchantId=${encodeURIComponent(
    merchantId
  )}&limit=${encodeURIComponent(String(limit))}`;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      {/* Left: back + title */}
      <div>
        <Link
          href="/invoices"
          className="mb-1 inline-flex items-center text-sm text-sky-600 hover:text-sky-700 hover:underline"
        >
          ← Back to invoices
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Accounting
        </h1>

        <div className="mt-1 text-sm text-zinc-600">
          <span className="mr-2">
            merchantId:{" "}
            <span className="font-mono text-zinc-800">{merchantId}</span>
          </span>
          ·
          <span className="mx-2">
            limit: <span className="font-mono text-zinc-800">{limit}</span>
          </span>
          ·
          <span className="ml-2">
            rows: <span className="font-mono text-zinc-800">{rows}</span>
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <a
          href={csvHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Download CSV
        </a>
      </div>
    </div>
  );
}
