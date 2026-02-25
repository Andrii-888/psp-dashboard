// src/components/home/HomeHero.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApiHealth } from "@/shared/hooks/useApiHealth";

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

function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  const toneClasses =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/10"
      : tone === "warn"
      ? "border-amber-500/20 bg-amber-500/10"
      : tone === "danger"
      ? "border-rose-500/20 bg-rose-500/10"
      : "border-white/10 bg-white/5";

  const valueClasses =
    tone === "good"
      ? "text-emerald-100"
      : tone === "warn"
      ? "text-amber-100"
      : tone === "danger"
      ? "text-rose-100"
      : "text-white";

  return (
    <div
      className={[
        "rounded-2xl border p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-md",
        "transition hover:border-white/20 hover:bg-white/10",
        "min-h-30p",
        toneClasses,
      ].join(" ")}
    >
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-300">
          {label}
        </div>

        <div
          className={[
            "mt-2 font-mono font-semibold tabular-nums leading-none",
            "text-[clamp(18px,2.4vw,28px)]",
            valueClasses,
          ].join(" ")}
        >
          {value}
        </div>

        <div className="mt-2 text-[11px] text-slate-400">
          {sub ? sub : "\u00A0"}
        </div>
      </div>
    </div>
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

  const [kpi, setKpi] = useState<{
    confirmed?: number;
    total?: number;
    pendingDecisions?: number;
    highRisk?: number;
  } | null>(null);

  useEffect(() => {
    if (apiOk !== true) return;

    let alive = true;

    async function load() {
      try {
        const invoicesRes = await fetch("/api/psp/invoices?limit=200&offset=0");
        const invoicesJson: unknown = invoicesRes.ok
          ? await invoicesRes.json()
          : null;

        if (process.env.NODE_ENV === "development") {
        }

        const isRecord = (v: unknown): v is Record<string, unknown> =>
          typeof v === "object" && v !== null;

        const extractInvoices = (data: unknown): Record<string, unknown>[] => {
          if (!data) return [];

          if (isRecord(data) && Array.isArray(data.items)) {
            return data.items.filter(isRecord);
          }

          if (Array.isArray(data)) {
            return data.filter(isRecord);
          }

          return [];
        };

        const invoices = extractInvoices(invoicesJson);

        if (!alive) return;
        setKpi({
          total: invoices.length,
          confirmed: invoices.filter((i) => i["status"] === "confirmed").length,

          pendingDecisions: invoices.filter((i) => {
            const s = String(i["decisionStatus"] ?? "").toLowerCase();
            return s === "pending" || s === "hold" || s === "";
          }).length,

          highRisk: invoices.filter((i) => {
            const risk = Number(i["riskScore"]);
            const asset = Number(i["assetRiskScore"]);

            const r = Math.max(
              Number.isFinite(risk) ? risk : 0,
              Number.isFinite(asset) ? asset : 0
            );

            return r >= 70;
          }).length,
        });
      } catch {
        if (!alive) return;
        setKpi(null);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [apiOk]);

  const fmtInt = useMemo(() => new Intl.NumberFormat("en-US"), []);

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

          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <KpiCard
              label="Confirmed"
              value={
                typeof kpi?.confirmed === "number"
                  ? fmtInt.format(kpi.confirmed)
                  : "—"
              }
              sub="Invoices (limit 200)"
              tone="default"
            />

            <KpiCard
              label="Total invoices"
              value={
                typeof kpi?.total === "number" ? fmtInt.format(kpi.total) : "—"
              }
              sub="Loaded (limit 200)"
              tone="default"
            />

            <Link href="/invoices?decision=queue" className="block">
              <KpiCard
                label="Pending decisions"
                value={
                  typeof kpi?.pendingDecisions === "number"
                    ? fmtInt.format(kpi.pendingDecisions)
                    : "—"
                }
                sub="Open queue →"
                tone={(kpi?.pendingDecisions ?? 0) > 0 ? "warn" : "default"}
              />
            </Link>

            <Link href="/invoices?risk=high" className="block">
              <KpiCard
                label="High risk"
                value={
                  typeof kpi?.highRisk === "number"
                    ? fmtInt.format(kpi.highRisk)
                    : "—"
                }
                sub="riskScore ≥ 70"
                tone={(kpi?.highRisk ?? 0) > 0 ? "danger" : "default"}
              />
            </Link>
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
