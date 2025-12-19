"use client";

import React from "react";

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
  return (
    <header className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          PSP Core — Invoices
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Internal dashboard for your Swiss crypto PSP core.
        </p>
      </div>

      <div className="flex flex-col items-end gap-2">
        {/* API status */}
        <div
          className={[
            "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs backdrop-blur-md",
            apiOk === true
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 shadow-[0_12px_35px_rgba(16,185,129,0.45)]"
              : apiOk === false
              ? "border-rose-500/40 bg-rose-500/10 text-rose-200 shadow-[0_12px_35px_rgba(244,63,94,0.35)]"
              : "border-slate-700/60 bg-slate-900/40 text-slate-300 shadow-[0_12px_35px_rgba(148,163,184,0.18)]",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-2 w-2 rounded-full",
              apiOk === true
                ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.45)]"
                : apiOk === false
                ? "bg-rose-400 shadow-[0_0_0_4px_rgba(244,63,94,0.35)]"
                : "bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.25)]",
            ].join(" ")}
          />
          <span className="font-medium">
            {apiOk === true
              ? "Connected to PSP-core API"
              : apiOk === false
              ? "PSP-core API not reachable"
              : "Checking PSP-core API…"}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Live badge */}
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/50 px-3 py-1.5 text-[11px] text-slate-300 ring-1 ring-slate-700/60">
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                liveOn
                  ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.20)]"
                  : "bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.18)]",
              ].join(" ")}
            />
            {liveOn ? "Live · 3s" : "Live off"}
          </span>

          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            className={[
              "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium ring-1 transition",
              soundOn
                ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-slate-800/60 text-slate-200 ring-slate-700/70 hover:bg-slate-800/85",
            ].join(" ")}
          >
            {soundOn ? "🔔 Sound: On" : "🔕 Sound: Off"}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center rounded-full bg-slate-800/60 px-4 py-1.5 text-xs font-medium text-slate-100 ring-1 ring-slate-700/70 transition hover:bg-slate-800/85 disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Meta */}
        {lastUpdatedAt ? (
          <p className="text-[11px] text-slate-400">
            Updated:{" "}
            {lastUpdatedAt.toLocaleString("de-CH", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        ) : null}

        {apiOk === false && apiError ? (
          <p className="max-w-420px truncate text-[11px] text-rose-200/80">
            {apiError}
          </p>
        ) : null}
      </div>
    </header>
  );
}
