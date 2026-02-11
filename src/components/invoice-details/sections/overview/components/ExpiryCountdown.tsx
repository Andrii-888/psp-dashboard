// src/components/invoice-details/overview/ExpiryCountdown.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { safeDate } from "@/lib/formatters";

type Props = {
  expiresAt: string | null;
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

export function ExpiryCountdown({ expiresAt }: Props) {
  const expiresMs = useMemo(() => {
    const d = safeDate(expiresAt);
    return d ? d.getTime() : null;
  }, [expiresAt]);

  const [nowMs, setNowMs] = useState<number>(0);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setNowMs(0);
    }, 0);

    const t = setInterval(() => {
      setNowMs((prev) => prev + 1000);
    }, 1000);

    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, []);

  if (!expiresMs) return null;

  const remainingMs = clampMs(expiresMs - nowMs);
  const isExpired = remainingMs <= 0;

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-[11px] ring-1 ring-slate-800/70">
      <span
        className={[
          "inline-block h-1.5 w-1.5 rounded-full",
          isExpired ? "bg-rose-400" : "bg-emerald-400",
        ].join(" ")}
      />
      <span className="text-slate-200">
        {isExpired ? "Expired" : `Expires in ${formatRemaining(remainingMs)}`}
      </span>
    </div>
  );
}
