// src/hooks/useApiHealth.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { healthCheck } from "@/lib/pspApi";

export function useApiHealth() {
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    let mounted = true;

    (async () => {
      try {
        setApiOk(null);
        setApiError(null);
        await healthCheck();
        if (mounted) setApiOk(true);
      } catch (e) {
        if (!mounted) return;
        setApiOk(false);
        setApiError(e instanceof Error ? e.message : "Unknown error");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { apiOk, apiError };
}
