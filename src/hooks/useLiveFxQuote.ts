// src/hooks/useLiveFxQuote.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Types
========================= */

export type FxQuote = {
  from: string;
  to: string;
  rate: number;
  source: string;
  lockedAt: string;
  ttlMs?: number;
};

type FxApiResponse = {
  from?: unknown;
  to?: unknown;
  rate?: unknown;
  source?: unknown;
  lockedAt?: unknown;
  ttlMs?: unknown;
};

type State = {
  loading: boolean;
  error: string | null;
  quote: FxQuote | null;
  fetchedAt: Date | null;
};

/* =========================
   Runtime guards
========================= */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/* =========================
   Hook
========================= */

export function useLiveFxQuote(params: {
  from: string; // e.g. "EUR"
  to: string; // e.g. "USDT"
  refreshMs?: number; // default: 20000
  enabled?: boolean; // default: true
}) {
  const enabled = params.enabled ?? true;

  const refreshMs = Math.max(5_000, Math.floor(params.refreshMs ?? 20_000));
  const from = params.from.trim().toUpperCase();
  const to = params.to.trim().toUpperCase();

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    quote: null,
    fetchedAt: null,
  });

  const intervalRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const url = useMemo(() => {
    const qs = new URLSearchParams({ from, to });
    return `/api/psp/fx/quote?${qs.toString()}`;
  }, [from, to]);

  useEffect(() => {
    if (!enabled || !from || !to) return;

    const fetchQuote = async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { "content-type": "application/json" },
          signal: ac.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`FX fetch failed: ${res.status} ${text}`.trim());
        }

        const raw: FxApiResponse = await res.json();

        if (!isFiniteNumber(raw.rate) || raw.rate <= 0) {
          throw new Error("FX response has invalid rate");
        }

        const quote: FxQuote = {
          from: isNonEmptyString(raw.from) ? raw.from : from,
          to: isNonEmptyString(raw.to) ? raw.to : "USD",
          rate: raw.rate,
          source: isNonEmptyString(raw.source) ? raw.source : "unknown",
          lockedAt: isNonEmptyString(raw.lockedAt)
            ? raw.lockedAt
            : new Date().toISOString(),
          ttlMs: isFiniteNumber(raw.ttlMs) ? raw.ttlMs : undefined,
        };

        setState({
          loading: false,
          error: null,
          quote,
          fetchedAt: new Date(),
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;

        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : "FX fetch failed",
        }));
      }
    };

    void fetchQuote();

    intervalRef.current = window.setInterval(fetchQuote, refreshMs);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [enabled, from, to, refreshMs, url]);

  return state;
}
