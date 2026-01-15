// src/app/accounting/components/FeesBreakdown.tsx

type FeesSummaryResponse = {
  merchantId: string;
  from: string | null;
  to: string | null;
  totalFiatSum: string;
  feesByCurrency: Array<{ currency: string; sum: string }>;
};

export default function FeesBreakdown({
  fees,
}: {
  fees: FeesSummaryResponse | null;
}) {
  if (!fees) return null;

  const rows = Array.isArray(fees.feesByCurrency) ? fees.feesByCurrency : [];

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold text-zinc-900">
          Fees breakdown (fiat)
        </div>
        <div className="text-sm text-zinc-600 tabular-nums">
          Total:{" "}
          <span className="font-semibold text-zinc-900">
            {fees.totalFiatSum}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-3 text-sm text-zinc-500">
          No fiat fee events in this range.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="py-2 pr-4">Currency</th>
                <th className="py-2 text-right">Sum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.currency}:${r.sum}`}
                  className="border-t border-zinc-100"
                >
                  <td className="py-2 pr-4 font-medium text-zinc-900">
                    {r.currency}
                  </td>
                  <td className="py-2 text-right tabular-nums text-zinc-900">
                    {r.sum}
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
