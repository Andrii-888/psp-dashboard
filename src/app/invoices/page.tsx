// src/app/invoices/page.tsx
"use client";

import { useEffect, useState } from "react";
import { FiltersBar } from "@/components/FiltersBar";
import { fetchInvoices, type Invoice } from "@/lib/pspApi";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [amlFilter, setAmlFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // новые фильтры по сумме
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

  useEffect(() => {
    async function loadInvoices() {
      try {
        setLoading(true);
        setError(null);

        // забираем все инвойсы с бэка (для MVP)
        const data = await fetchInvoices();

        const filtered = data.filter((inv) => {
          // 1) фильтр по статусу
          const matchStatus =
            statusFilter === "all" ? true : inv.status === statusFilter;

          // 2) поиск по id
          const matchSearch = search
            ? inv.id.toLowerCase().includes(search.toLowerCase())
            : true;

          // 3) фильтр по AML
          const matchAml =
            amlFilter === "all"
              ? true
              : amlFilter === "none"
              ? inv.amlStatus == null
              : inv.amlStatus === amlFilter;

          // 4) фильтр по сумме (fiatAmount)
          let matchAmount = true;

          const min = minAmount
            ? Number(minAmount.replace(",", "."))
            : undefined;
          const max = maxAmount
            ? Number(maxAmount.replace(",", "."))
            : undefined;

          if (typeof min === "number" && !Number.isNaN(min)) {
            if (inv.fiatAmount < min) matchAmount = false;
          }

          if (typeof max === "number" && !Number.isNaN(max)) {
            if (inv.fiatAmount > max) matchAmount = false;
          }

          return matchStatus && matchSearch && matchAml && matchAmount;
        });

        setInvoices(filtered);
      } catch (err: any) {
        setError(err?.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, [statusFilter, amlFilter, search, minAmount, maxAmount]);

  // summary для верхнего блока (по текущему списку)
  const totalCount = invoices.length;
  const confirmedCount = invoices.filter(
    (inv) => inv.status === "confirmed"
  ).length;
  const waitingCount = invoices.filter(
    (inv) => inv.status === "waiting"
  ).length;
  const highRiskCount = invoices.filter(
    (inv) => inv.amlStatus === "risky"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:gap-6">
        {/* Header */}
        <header className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
              PSP Core — Invoices
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Internal dashboard for your Swiss crypto PSP core.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-200 shadow-[0_12px_35px_rgba(16,185,129,0.45)] backdrop-blur-md">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.45)]" />
            <span className="font-medium">Connected to PSP-core API</span>
          </div>
        </header>

        {/* Filters */}
        <section className="apple-card-section">
          <FiltersBar
            status={statusFilter}
            onStatusChange={setStatusFilter}
            amlStatus={amlFilter}
            onAmlStatusChange={setAmlFilter}
            search={search}
            onSearchChange={setSearch}
            minAmount={minAmount}
            maxAmount={maxAmount}
            onMinAmountChange={setMinAmount}
            onMaxAmountChange={setMaxAmount}
          />
        </section>

        {/* Main card with summary + table */}
        <section className="apple-card overflow-hidden">
          <div className="border-b border-slate-800/70 px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                  Invoices
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Showing latest records from your PSP core.
                </p>
              </div>

              {/* summary-плашки справа */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span className="rounded-full bg-slate-800/70 px-3 py-1">
                  Total:{" "}
                  <span className="font-semibold text-slate-50">
                    {totalCount}
                  </span>
                </span>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  Confirmed:{" "}
                  <span className="font-semibold text-emerald-100">
                    {confirmedCount}
                  </span>
                </span>
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-200">
                  Waiting:{" "}
                  <span className="font-semibold text-amber-100">
                    {waitingCount}
                  </span>
                </span>
                <span className="rounded-full bg-rose-500/12 px-3 py-1 text-rose-200 ring-1 ring-rose-500/40">
                  High-risk:{" "}
                  <span className="font-semibold text-rose-100">
                    {highRiskCount}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 py-3 md:px-4 md:py-4">
            <InvoicesTable
              invoices={invoices}
              loading={loading}
              error={error}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
