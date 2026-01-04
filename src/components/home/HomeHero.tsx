"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { healthCheck } from "@/lib/pspApi";

export function HomeHero() {
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await healthCheck();
        if (mounted) setApiOk(true);
      } catch {
        if (mounted) setApiOk(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const statusText =
    apiOk === true
      ? "PSP Core connected"
      : apiOk === false
      ? "PSP Core unavailable"
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
    <section className="relative flex h-[85vh] w-full items-center justify-center overflow-hidden px-4">
      {/* background */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_20%,rgba(139,92,246,0.25),transparent_60%),linear-gradient(180deg,#0b061a_0%,#05030d_100%)]" />
      <div className="absolute -top-32 left-1/2 h-420px w-680px -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />

      <div className="relative z-10 space-y-7 text-center">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          PSP Dashboard · CryptoPay
        </h1>

        <div className="flex justify-center">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur-md ${statusClasses}`}
          >
            <span className={`h-2 w-2 rounded-full ${dotClasses}`} />
            {statusText}
          </span>
        </div>

        <Link
          href="/invoices"
          className="inline-flex items-center justify-center rounded-full
            bg-linear-to-r from-violet-500 to-fuchsia-500
            px-7 py-3 text-sm font-medium text-white
            shadow-[0_10px_30px_rgba(139,92,246,0.45)]
            transition
            hover:scale-[1.02]
            hover:shadow-[0_15px_45px_rgba(139,92,246,0.65)]
          "
        >
          Open dashboard →
        </Link>
      </div>
    </section>
  );
}
