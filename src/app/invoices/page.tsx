"use client";

import { useEffect, useState } from "react";
import FiltersBar, { InvoiceFilters } from "@/components/FiltersBar";

type InvoiceStatus = "waiting" | "confirmed" | "expired" | "rejected";

type Invoice = {
  id: string;
  createdAt: string;
  expiresAt: string;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount: number;
  cryptoCurrency: string;
  status: InvoiceStatus;
  paymentUrl: string;
  network?: string | null;
  txHash?: string | null;
  walletAddress?: string | null;
  riskScore?: number | null;
  amlStatus?: string | null;
  merchantId?: string | null;
};

// URL твоего NestJS-бэка (psp-core)
const PSP_CORE_URL =
  process.env.NEXT_PUBLIC_PSP_CORE_URL ?? "http://localhost:3000";

export default function InvoicesPage() {
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  async function loadInvoices(options?: { resetOffset?: boolean }) {
    try {
      setIsLoading(true);
      setError(null);

      const currentOffset = options?.resetOffset === true ? 0 : offset;

      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      params.set("limit", String(limit));
      params.set("offset", String(currentOffset));

      const res = await fetch(`${PSP_CORE_URL}/invoices?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as Invoice[];

      if (options?.resetOffset) {
        setOffset(0);
      }

      setInvoices(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // первый загруз
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadInvoices({ resetOffset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadInvoices({ resetOffset: true });
  };

  const handleResetFilters = () => {
    setFilters({});
    setOffset(0);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadInvoices({ resetOffset: true });
  };

  const handleNextPage = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadInvoices();
  };

  const handlePrevPage = () => {
    const newOffset = Math.max(0, offset - limit);
    setOffset(newOffset);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadInvoices();
  };

  return (
    <div className="min-h-screen bg-[#050711] text-white px-6 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">CryptoPay PSP — Invoices</h1>
            <p className="text-sm text-gray-400 mt-1">
              Internal dashboard for the Swiss payment partner.
            </p>
          </div>
        </header>

        {/* Filters */}
        <FiltersBar
          value={filters}
          onChange={setFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />

        {/* Table */}
        <div className="bg-[#10131A] border border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-sm text-gray-300">
              Results: {invoices.length}
            </span>
            <span className="text-xs text-gray-500">
              Limit {limit}, offset {offset}
            </span>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-gray-400">Loading…</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-400">Error: {error}</div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">No invoices found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#0B0E15] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Fiat</th>
                  <th className="px-4 py-3 text-left">Crypto</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">AML</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-t border-neutral-800 hover:bg-[#141824] transition"
                  >
                    <td className="px-4 py-3 font-mono text-xs max-w-[220px] truncate">
                      {inv.id}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {new Date(inv.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {inv.fiatAmount} {inv.fiatCurrency}
                    </td>
                    <td className="px-4 py-3">
                      {inv.cryptoAmount} {inv.cryptoCurrency}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs capitalize bg-neutral-800">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {inv.amlStatus ?? "-"}{" "}
                      {typeof inv.riskScore === "number"
                        ? `(score ${inv.riskScore})`
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={handlePrevPage}
            disabled={offset === 0}
            className="px-4 py-2 rounded-lg text-sm bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            className="px-4 py-2 rounded-lg text-sm bg-neutral-800"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
