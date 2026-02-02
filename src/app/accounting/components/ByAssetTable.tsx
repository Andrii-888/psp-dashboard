// src/app/accounting/components/ByAssetTable.tsx

type ByAssetResponse = {
  merchantId: string;
  from: string | null;
  to: string | null;
  emptyReason?: string;
  rows: Array<{
    currency: string;
    network: string;
    confirmedCount: number;
    grossSum: string;
    feeSum: string;
    netSum: string;
  }>;
};

export default function ByAssetTable({
  data,
}: {
  data: ByAssetResponse | null;
}) {
  if (!data) return null;

  const rows = Array.isArray(data.rows) ? data.rows : [];
  const emptyText = String(data.emptyReason ?? "").trim();

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">By asset</div>

      {rows.length === 0 ? (
        <div className="mt-3 text-sm text-zinc-500">
          {emptyText || "No rows in this range."}
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="py-2 pr-4">Currency</th>
                <th className="py-2 pr-4">Network</th>
                <th className="py-2 pr-4">Confirmed</th>
                <th className="py-2 pr-4">Gross</th>
                <th className="py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.currency}:${r.network}`}
                  className="border-t border-zinc-100"
                >
                  <td className="py-2 pr-4 font-medium text-zinc-900">
                    {r.currency}
                  </td>
                  <td className="py-2 pr-4 text-zinc-900">{r.network}</td>
                  <td className="py-2 pr-4 tabular-nums text-zinc-900">
                    {r.confirmedCount}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-zinc-900">
                    {r.grossSum}
                  </td>
                  <td className="py-2 text-right tabular-nums text-zinc-900">
                    {r.netSum}
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
