"use client";

import { useCallback, useState } from "react";
import type { ToastItem } from "@/components/ui/ToastStack";

function makeToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback(
    (message: string, variant: ToastItem["variant"] = "info") => {
      const id = makeToastId();
      setToasts((prev) => [...prev, { id, message, variant }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => setToasts([]), []);

  return { toasts, pushToast, removeToast, clearToasts };
}
