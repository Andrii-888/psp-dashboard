// src/hooks/useApiHealth.ts
"use client";

import { useEffect, useState } from "react";
import { healthCheck } from "@/lib/pspApi";

export function useApiHealth() {
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setApiOk(null);
        setApiError(null);

        await healthCheck();

        if (!cancelled) setApiOk(true);
      } catch (e) {
        if (cancelled) return;
        setApiOk(false);
        setApiError(e instanceof Error ? e.message : "Unknown error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { apiOk, apiError };
}
