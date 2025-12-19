"use client";

import { useEffect, useRef, useState } from "react";

type ReloadFn = (opts?: { silent?: boolean }) => Promise<void>;

type UseLiveInvoicesParams = {
  invoices: Array<{ id?: string }> | undefined;
  reload: ReloadFn;
  creating?: boolean;
  intervalMs?: number;
  resetKey?: string; // ✅ при смене фильтров сбрасываем baseline
  onNewInvoices?: (count: number) => void;
};

type UseLiveInvoicesResult = {
  liveOn: boolean;
  soundOn: boolean;
  toggleSound: () => void;
};

export function useLiveInvoices({
  invoices,
  reload,
  creating = false,
  intervalMs = 3000,
  resetKey,
  onNewInvoices,
}: UseLiveInvoicesParams): UseLiveInvoicesResult {
  const [liveOn] = useState(true);

  const [soundOn, setSoundOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const inFlightRef = useRef(false);
  const seenIdsRef = useRef<Set<string> | null>(null);

  function ensureAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as
      | typeof AudioContext
      | undefined;
    if (!AC) return null;
    if (!audioCtxRef.current) audioCtxRef.current = new AC();
    return audioCtxRef.current;
  }

  async function unlockAudio() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }
    }
  }

  function playPing() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") return;
    if (typeof document !== "undefined" && document.hidden) return;

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    osc1.frequency.setValueAtTime(880, now);
    osc2.frequency.setValueAtTime(1320, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.19);
    osc2.stop(now + 0.19);
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    if (next) void unlockAudio();
  }

  // ✅ при смене фильтров — сбросить baseline (чтобы не было “ложных новых”)
  useEffect(() => {
    seenIdsRef.current = null;
  }, [resetKey]);

  // ✅ Live polling (silent!)
  useEffect(() => {
    if (!liveOn) return;

    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      if (creating) return;
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      try {
        await reload({ silent: true }); // ✅ ключевой фикс от “дёрганья”
      } catch {
        // тихо
      } finally {
        inFlightRef.current = false;
      }
    }

    const id = setInterval(() => void tick(), intervalMs);
    void tick();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [liveOn, intervalMs, reload, creating]);

  // ✅ Детектор новых инвойсов + звук
  useEffect(() => {
    if (!invoices) return;

    const ids = invoices
      .map((x) => x?.id)
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    if (!seenIdsRef.current) {
      seenIdsRef.current = new Set(ids);
      return;
    }

    const seen = seenIdsRef.current;
    let newCount = 0;

    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        newCount += 1;
      }
    }

    if (newCount > 0) {
      if (soundOn) playPing();
      onNewInvoices?.(newCount);
    }
  }, [invoices, soundOn, onNewInvoices]);

  return { liveOn, soundOn, toggleSound };
}
