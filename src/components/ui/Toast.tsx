"use client";

import { useEffect } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  variant = "info",
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  const styles: Record<ToastVariant, string> = {
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    error: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    info: "border-slate-600/40 bg-slate-800/60 text-slate-200",
  };

  return (
    <div
      className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-md ${styles[variant]}`}
    >
      {message}
    </div>
  );
}
