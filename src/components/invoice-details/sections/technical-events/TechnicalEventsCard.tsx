"use client";

import type { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  providerEvents: ReactNode;
  webhookEvents: ReactNode;
};

export function TechnicalEventsCard({
  title = "Integration & Delivery Logs",
  subtitle = "Provider events and outbound webhooks for operational monitoring.",
  providerEvents,
  webhookEvents,
}: Props) {
  return (
    <section className="apple-card apple-card-content p-4 md:p-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="section-title">{title}</h2>
        <p className="text-[11px] text-slate-500">{subtitle}</p>
      </div>

      {/* Collapsible Sections */}
      <div className="mt-4 space-y-4">
        {/* Provider Events */}
        <details
          open
          className="group rounded-2xl bg-slate-900/40 ring-1 ring-slate-800/70"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Provider events
            </span>
            <span className="text-xs text-slate-500 group-open:hidden">
              Show
            </span>
            <span className="text-xs text-slate-500 hidden group-open:inline">
              Hide
            </span>
          </summary>
          <div className="border-t border-slate-800/60 p-3 md:p-4">
            {providerEvents}
          </div>
        </details>

        {/* Webhook Events */}
        <details className="group rounded-2xl bg-slate-900/40 ring-1 ring-slate-800/70">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Webhook events
            </span>
            <span className="text-xs text-slate-500 group-open:hidden">
              Show
            </span>
            <span className="text-xs text-slate-500 hidden group-open:inline">
              Hide
            </span>
          </summary>
          <div className="border-t border-slate-800/60 p-3 md:p-4">
            {webhookEvents}
          </div>
        </details>
      </div>
    </section>
  );
}
