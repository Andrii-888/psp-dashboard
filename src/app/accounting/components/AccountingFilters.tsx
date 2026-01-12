"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LIMITS = [5, 20, 50, 100, 200];

export default function AccountingFilters({
  merchantId,
  limit,
}: {
  merchantId: string;
  limit: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [merchant, setMerchant] = useState(merchantId);

  const currentParams = useMemo(() => {
    return new URLSearchParams(sp?.toString() ?? "");
  }, [sp]);

  function apply(nextMerchantId: string, nextLimit: number) {
    const p = new URLSearchParams(currentParams.toString());
    p.set("merchantId", nextMerchantId.trim() || "demo-merchant");
    p.set("limit", String(nextLimit));
    router.push(`/accounting?${p.toString()}`);
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Merchant ID
          </label>
          <input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="demo-merchant"
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Limit
          </label>
          <select
            value={limit}
            onChange={(e) => apply(merchant, Number(e.target.value))}
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          >
            {LIMITS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => apply(merchant, limit)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Apply
          </button>

          <button
            type="button"
            onClick={() => {
              setMerchant("demo-merchant");
              apply("demo-merchant", 20);
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
