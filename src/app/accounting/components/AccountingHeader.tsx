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
  return (
    <div className="flex items-start justify-between gap-4">
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
    </div>
  );
}
