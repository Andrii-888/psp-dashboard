// src/app/accounting/components/AccountingFilters.tsx
"use client";

import {
  MerchantSelect,
  LimitDropdown,
  DateRangePicker,
  toYmd,
  startOfMonth,
} from "./filters";

import { useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AccountingFilters({
  merchantId,
  limit,
  from,
  to,
}: {
  merchantId: string;
  limit: number;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [merchant, setMerchant] = useState(merchantId);
  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(to);

  const dateTimerRef = useRef<number | null>(null);

  function scheduleDateApply(nextFrom: string, nextTo: string) {
    if (dateTimerRef.current) window.clearTimeout(dateTimerRef.current);

    dateTimerRef.current = window.setTimeout(() => {
      pushWithParams({ from: nextFrom, to: nextTo });
    }, 300);
  }

  const currentParams = useMemo(() => {
    return new URLSearchParams(sp?.toString() ?? "");
  }, [sp]);

  function applyPreset(preset: "7d" | "30d" | "90d" | "month") {
    const now = new Date();
    const end = toYmd(now);

    let start = end;

    if (preset === "7d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      start = toYmd(d);
    }

    if (preset === "30d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      start = toYmd(d);
    }

    if (preset === "90d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      start = toYmd(d);
    }

    if (preset === "month") {
      start = toYmd(startOfMonth(now));
    }

    setFromDate(start);
    setToDate(end);

    // apply with the NEW dates immediately
    // (apply reads fromDate/toDate state, so we push directly here)
    const p = new URLSearchParams(currentParams.toString());
    p.set("merchantId", merchant.trim() || "demo-merchant");
    p.set("limit", String(limit));
    p.set("from", start);
    p.set("to", end);
    router.push(`/accounting?${p.toString()}`);
  }

  function pushWithParams(next: {
    merchantId?: string;
    limit?: number;
    from?: string;
    to?: string;
  }) {
    const p = new URLSearchParams(currentParams.toString());

    const m = (next.merchantId ?? merchant).trim() || "demo-merchant";
    const l = next.limit ?? limit;

    p.set("merchantId", m);
    p.set("limit", String(l));

    const f = (next.from ?? fromDate ?? "").trim();
    const t = (next.to ?? toDate ?? "").trim();

    if (f) p.set("from", f);
    else p.delete("from");

    if (t) p.set("to", t);
    else p.delete("to");

    router.push(`/accounting?${p.toString()}`);
  }

  function apply(nextMerchantId: string, nextLimit: number) {
    const p = new URLSearchParams(currentParams.toString());
    p.set("merchantId", nextMerchantId.trim() || "demo-merchant");
    p.set("limit", String(nextLimit));

    // Dates (YYYY-MM-DD). Empty -> remove param
    const f = (fromDate ?? "").trim();
    const t = (toDate ?? "").trim();

    if (f) p.set("from", f);
    else p.delete("from");

    if (t) p.set("to", t);
    else p.delete("to");

    router.push(`/accounting?${p.toString()}`);
  }

  return (
    <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.12)] backdrop-blur">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
        {/* Merchant */}
        <div className="sm:col-span-8">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Merchant
          </label>

          <MerchantSelect
            value={merchant}
            onChange={(id) => {
              setMerchant(id);
              apply(id, limit);
            }}
          />
        </div>

        {/* Limit */}
        <div className="sm:col-span-4">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Limit
          </label>

          <LimitDropdown value={limit} onChange={(n) => apply(merchant, n)} />
        </div>

        {/* Dates */}
        <div className="sm:col-span-12">
          <DateRangePicker
            from={fromDate}
            to={toDate}
            onChange={(nextFrom, nextTo) => {
              setFromDate(nextFrom);
              setToDate(nextTo);
              scheduleDateApply(nextFrom, nextTo);
            }}
          />
        </div>

        {/* Date presets */}
        <div className="sm:col-span-12">
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset("7d")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Last 7 days
            </button>

            <button
              type="button"
              onClick={() => applyPreset("30d")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Last 30 days
            </button>

            <button
              type="button"
              onClick={() => applyPreset("90d")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Last 90 days
            </button>

            <button
              type="button"
              onClick={() => applyPreset("month")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              This month
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="sm:col-span-12 flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => apply(merchant, limit)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Apply
          </button>

          <button
            type="button"
            onClick={() => {
              setMerchant("demo-merchant");
              setFromDate("");
              setToDate("");
              apply("demo-merchant", 20);
            }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
