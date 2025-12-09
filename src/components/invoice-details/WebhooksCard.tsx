"use client";

import type { WebhookEvent, WebhookDispatchResult } from "@/lib/pspApi";

interface Props {
  webhooks: WebhookEvent[];
  webhookInfo: WebhookDispatchResult | null;
  loading: boolean; // 👈 совпадает с loading={webhooksLoading}
  dispatching: boolean;
  onReload: () => void;
  onDispatch: () => void;
  formatDateTime: (iso: string | null | undefined) => string;
}

export function WebhooksCard({
  webhooks,
  webhookInfo,
  loading,
  dispatching,
  onReload,
  onDispatch,
  formatDateTime,
}: Props) {
  return (
    <section className="apple-card apple-card-content p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title">Webhook events</h2>
          <p className="mt-1 text-xs text-slate-500">
            Pending events can be dispatched manually.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={onReload}
            disabled={loading || dispatching}
            className="rounded-full bg-slate-800/70 px-3 py-1 text-slate-100 
                       ring-1 ring-slate-600/80 transition hover:bg-slate-700 
                       disabled:opacity-60"
          >
            {loading ? "Reloading…" : "Reload"}
          </button>

          <button
            type="button"
            onClick={onDispatch}
            disabled={dispatching}
            className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-100 
                       ring-1 ring-emerald-500/60 transition hover:bg-emerald-500/30 
                       disabled:opacity-60"
          >
            {dispatching ? "Dispatching…" : "Dispatch pending"}
          </button>
        </div>
      </div>

      {/* Dispatch result box */}
      {webhookInfo && (
        <div
          className="mt-3 rounded-2xl bg-slate-900/70 p-3 
                     text-[11px] text-slate-200 ring-1 ring-slate-700/80"
        >
          <p>
            Processed:{" "}
            <span className="font-semibold">{webhookInfo.processed}</span> •
            Sent: <span className="font-semibold">{webhookInfo.sent}</span> •
            Failed: <span className="font-semibold">{webhookInfo.failed}</span>
          </p>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        {webhooks.length === 0 ? (
          <p className="text-xs text-slate-500">No webhook events yet.</p>
        ) : (
          <table className="min-w-full border-separate border-spacing-y-1 text-[11px]">
            <thead>
              <tr className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                <th className="px-2 py-1 text-left">ID</th>
                <th className="px-2 py-1 text-left">Type</th>
                <th className="px-2 py-1 text-left">Status</th>
                <th className="px-2 py-1 text-left">Retries</th>
                <th className="px-2 py-1 text-left">Created</th>
              </tr>
            </thead>

            <tbody>
              {webhooks.map((wh) => (
                <tr
                  key={wh.id}
                  className="rounded-2xl bg-slate-900/60 text-slate-200 
                             shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
                >
                  <td className="max-w-[200px] truncate px-2 py-2 font-mono">
                    {wh.id}
                  </td>
                  <td className="px-2 py-2">{wh.eventType}</td>
                  <td className="px-2 py-2 text-slate-300">{wh.status}</td>
                  <td className="px-2 py-2 text-slate-300">{wh.retryCount}</td>
                  <td className="px-2 py-2 text-slate-400">
                    {formatDateTime(wh.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
