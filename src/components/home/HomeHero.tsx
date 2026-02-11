// src/components/home/HomeHero.tsx
"use client";

import Link from "next/link";
import { useApiHealth } from "@/hooks/useApiHealth";

function StatusPill({
  apiOk,
  apiError,
}: {
  apiOk: boolean | null;
  apiError: string | null;
}) {
  const statusText =
    apiOk === true
      ? "PSP Core connected"
      : apiOk === false
      ? `PSP Core unavailable${apiError ? ` · ${apiError}` : ""}`
      : "Connecting to PSP Core…";

  const statusClasses =
    apiOk === true
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
      : apiOk === false
      ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30"
      : "bg-white/5 text-slate-200 ring-1 ring-white/10";

  const dotClasses =
    apiOk === true
      ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.35)]"
      : apiOk === false
      ? "bg-rose-400 shadow-[0_0_0_4px_rgba(244,63,94,0.25)]"
      : "bg-slate-300 shadow-[0_0_0_4px_rgba(148,163,184,0.18)]";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur-md ${statusClasses}`}
      title={apiError ?? undefined}
    >
      <span className={`h-2 w-2 rounded-full ${dotClasses}`} />
      {statusText}
    </span>
  );
}

function QuickCard({
  title,
  desc,
  href,
  cta,
}: {
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-md transition hover:border-white/20 hover:bg-white/7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-xs leading-relaxed text-slate-300">
            {desc}
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-200 ring-1 ring-white/10 transition group-hover:bg-white/10">
          {cta} →
        </div>
      </div>
    </Link>
  );
}

function GuidedActions({ apiOk }: { apiOk: boolean | null }) {
  if (apiOk === null) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-xs text-slate-300">
        <div className="font-semibold text-slate-100">System status</div>
        <div className="mt-1">
          Checking PSP Core connectivity… If it takes too long, verify{" "}
          <span className="text-slate-100">PSP_API_URL</span> and your network.
        </div>
      </div>
    );
  }

  if (apiOk === false) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-left text-xs text-rose-200">
        <div className="font-semibold text-rose-100">Action required</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Check PSP Core availability (Fly deployment / logs).</li>
          <li>Verify dashboard env: PSP_API_URL + merchant creds.</li>
          <li>Open Invoices after core is back to confirm SSOT data.</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-left text-xs text-emerald-200">
      <div className="font-semibold text-emerald-100">All good</div>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Review newest invoices and confirm status transitions.</li>
        <li>Go to Accounting to validate totals vs ledger.</li>
        <li>Use invoice details to verify tx/AML/webhooks fields.</li>
      </ul>
    </div>
  );
}

export function HomeHero() {
  const { apiOk, apiError } = useApiHealth();

  return (
    <section className="relative flex min-h-[85vh] w-full items-center justify-center overflow-hidden px-4">
      {/* background */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_20%,rgba(139,92,246,0.25),transparent_60%),linear-gradient(180deg,#0b061a_0%,#05030d_100%)]" />
      <div className="absolute -top-32 left-1/2 h-420px w-680px -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />

      <div className="relative z-10 w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            PSP Dashboard · Control Panel
          </h1>

          <div className="mt-4 flex justify-center">
            <StatusPill apiOk={apiOk} apiError={apiError} />
          </div>

          <div className="mt-3 text-xs text-slate-300">
            Operator view — status, money flows, and audit-ready documents.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <QuickCard
            title="Invoices"
            desc="Financial documents: statuses, fees, FX, AML decision, webhooks."
            href="/invoices"
            cta="Open"
          />
          <QuickCard
            title="Accounting"
            desc="SSOT totals, reconciliations, guided actions, audit trail."
            href="/accounting"
            cta="Open"
          />
        </div>

        <GuidedActions apiOk={apiOk} />
      </div>
    </section>
  );
}
