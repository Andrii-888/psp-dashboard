"use client";

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
            ? "break-all"
            : "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap",
        ].join(" ")}
        title={title}
      >
        {value}
      </div>
    </div>
  );
}

export default function Accounting({ note }: { note?: string }) {
  // пока ledger SSOT не подключили — показываем честный статус
  const ledgerStatus = "NOT CONNECTED";
  const entries = "—";
  const reversal = "—";

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-zinc-900">
              Accounting
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Ledger SSOT will be connected here (entries + totals + reversals).
            </div>
          </div>
        </div>

        <div className="mt-4 divide-y divide-zinc-100">
          <Row label="Ledger status" value={ledgerStatus} />
          <Row label="Entries" value={entries} />
          <Row label="Reversal" value={reversal} />

          <Row
            label="Retention"
            mono={false}
            tone="muted"
            wrap
            value={
              note ??
              "Receipt view for accounting & audit. Payment facts must be retained for 10 years and provided on request."
            }
          />
        </div>
      </div>
    </section>
  );
}
