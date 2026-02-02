// src/app/accounting/components/ByDayTable.tsx

type ByDayResponse = {
  merchantId: string;
  from: string | null;
  to: string | null;
  emptyReason?: string;
  rows: Array<{
    day: string; // YYYY-MM-DD
    confirmedCount: number;
    grossSum: string;
    feeSum: string;
    netSum: string;
    feeFiatTotal: string;
  }>;
};

export default function ByDayTable({ data }: { data: ByDayResponse | null }) {
  if (!data) return null;

  const rows = Array.isArray(data.rows) ? data.rows : [];
  const emptyText = String(data.emptyReason ?? "").trim();

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">By day</div>

      {rows.length === 0 ? (
        <div className="mt-3 text-sm text-zinc-500">
          {emptyText || "No rows in this range."}
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="py-2 pr-4">Day</th>
                <th className="py-2 pr-4">Confirmed</th>
                <th className="py-2 pr-4">Gross</th>
                <th className="py-2 pr-4">Net</th>
                <th className="py-2 text-right">Fee (fiat)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day} className="border-t border-zinc-100">
                  <td className="py-2 pr-4 text-zinc-900">{r.day}</td>
                  <td className="py-2 pr-4 tabular-nums text-zinc-900">
                    {r.confirmedCount}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-zinc-900">
                    {r.grossSum}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-zinc-900">
                    {r.netSum}
                  </td>
                  <td className="py-2 text-right tabular-nums text-zinc-900">
                    {r.feeFiatTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
