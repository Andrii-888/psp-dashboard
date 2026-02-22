"use client";

import { useEffect, useMemo, useState } from "react";
import { safeDate } from "@/lib/formatters";

type Props = {
  expiresAt: string | null;
  status?: string | null;
};

function clampMs(ms: number): number {
  return Number.isFinite(ms) ? Math.max(0, ms) : 0;
}

function formatRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ExpiryCountdown({ expiresAt, status }: Props) {
  const expiresMs = useMemo(() => {
    const d = safeDate(expiresAt);
    return d ? d.getTime() : null;
  }, [expiresAt]);

  const [nowMs, setNowMs] = useState<number>(() => new Date().getTime());

  useEffect(() => {
    const t = setInterval(() => {
      setNowMs(new Date().getTime());
    }, 1000);

    return () => clearInterval(t);
  }, []);

  if (!expiresMs) return null;

  const remainingMs = clampMs(expiresMs - nowMs);
  const ssotExpired = String(status ?? "").toLowerCase() === "expired";
  const pastTtl = remainingMs <= 0;

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-[11px] ring-1 ring-slate-800/70">
      <span
        className={[
          "inline-block h-1.5 w-1.5 rounded-full",
          ssotExpired
            ? "bg-rose-400"
            : pastTtl
            ? "bg-amber-400"
            : "bg-emerald-400",
        ].join(" ")}
      />
      <span className="text-slate-200">
        {ssotExpired
          ? "Expired"
          : pastTtl
          ? "Past TTL"
          : `Expires in ${formatRemaining(remainingMs)}`}
      </span>
    </div>
  );
}
