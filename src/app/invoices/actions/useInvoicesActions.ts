"use client";

import { useCallback, useState } from "react";

type ToastFn = (message: string, variant?: "info" | "success" | "error") => void;

type Args = {
  reload: () => Promise<void>;
  pushToast: ToastFn;
};

export function useInvoicesActions({ reload, pushToast }: Args) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await reload();
      pushToast("Invoices refreshed", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to refresh";
      pushToast(msg, "error");
    } finally {
      setRefreshing(false);
    }
  }, [reload, pushToast]);

  return { refreshing, refresh };
}
