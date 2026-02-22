"use client";

import { useRouter } from "next/navigation";
import { formatDateTimeCH } from "@/shared/lib/formatters";

type Props = {
  apiOk: boolean | null;
  apiError: string | null;
  lastUpdatedAt: Date | null;

  liveOn: boolean;
  soundOn: boolean;
  toggleSound: () => void;

  loading: boolean;
  refreshing: boolean;

  onRefresh: () => void;
};

export function InvoicesPageHeader({
  apiOk,
  apiError,
  lastUpdatedAt,

  liveOn,
  soundOn,
  toggleSound,

  loading,
  refreshing,

  onRefresh,
}: Props) {
  const router = useRouter();

  const updatedTitle = `Updated: ${
    lastUpdatedAt ? formatDateTimeCH(lastUpdatedAt.toISOString()) : "—"
  }`;

  return (
    <header className="flex items-center justify-between gap-3">
      <h1 className="min-w-0 truncate text-[15px] font-medium tracking-tight text-slate-100">
        Payments Review
      </h1>

      <div className="flex items-center gap-2">
        {/* API status */}
        <div
          className={[
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] backdrop-blur-md",
            apiOk === true
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : apiOk === false
              ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
              : "border-slate-700/60 bg-slate-900/40 text-slate-300",
          ].join(" ")}
          title={
            apiOk === true
              ? "Connected to PSP-core API"
              : apiOk === false
              ? "PSP-core API not reachable"
              : "Checking PSP-core API…"
          }
        >
          <span
            className={[
              "inline-block h-1.5 w-1.5 rounded-full",
              apiOk === true
                ? "bg-emerald-400"
                : apiOk === false
                ? "bg-rose-400"
                : "bg-slate-400",
            ].join(" ")}
          />
          <span className="text-[11px] font-medium text-slate-300">
            {apiOk === true
              ? "Online"
              : apiOk === false
              ? "Unavailable"
              : "Checking…"}
          </span>
        </div>

        {/* Live badge */}
        <span
          className="inline-flex items-center gap-2 rounded-full bg-slate-900/40 px-2.5 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/60"
          title={updatedTitle}
        >
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",
              liveOn
                ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]"
                : "bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.14)]",
            ].join(" ")}
          />
          {liveOn ? "Live" : "Live off"}
        </span>

        {/* Accounting */}
        <button
          type="button"
          onClick={() => router.push("/accounting")}
          className="inline-flex items-center justify-center rounded-full bg-slate-800/60 px-3 py-1 text-[11px] font-medium text-slate-100 ring-1 ring-slate-700/70 transition hover:bg-slate-800/85"
        >
          Accounting
        </button>

        {/* Sound toggle */}
        <button
          type="button"
          onClick={toggleSound}
          className={[
            "inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-medium ring-1 transition",
            soundOn
              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30 hover:bg-emerald-500/20"
              : "bg-slate-800/60 text-slate-200 ring-slate-700/70 hover:bg-slate-800/85",
          ].join(" ")}
        >
          {soundOn ? "Sound: On" : "Sound: Off"}
        </button>

        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center rounded-full bg-slate-800/60 px-3 py-1 text-[11px] font-medium text-slate-100 ring-1 ring-slate-700/70 transition hover:bg-slate-800/85 disabled:opacity-60"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>

        {/* API error (compact, no layout shift) */}
        {apiOk === false && apiError ? (
          <span
            className="max-w-xs truncate text-[11px] text-rose-400/60 opacity-80"
            title={apiError}
          >
            {apiError}
          </span>
        ) : null}
      </div>
    </header>
  );
}
