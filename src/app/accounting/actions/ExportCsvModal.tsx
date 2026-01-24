"use client";

import { useEffect, useRef } from "react";

export default function ExportCsvModal({
  open,
  title = "Export accounting report",
  description = "This will download a CSV file for the selected filters.",
  details,
  confirmText = "Download CSV",
  cancelText = "Cancel",
  loading = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  description?: string;
  details?: { label: string; value: string }[];
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Autofocus confirm button (ChatGPT-like)
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => confirmBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
      />

      {/* Panel */}
      <div
        className={[
          "relative w-full max-w-md overflow-hidden rounded-3xl",
          "border border-slate-200 bg-white text-slate-900",
          "shadow-[0_30px_90px_rgba(0,0,0,0.25)]",
          "animate-[fadeIn_160ms_ease-out]",
        ].join(" ")}
      >
        <div className="px-6 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {description}
              </p>
            </div>
          </div>

          {details && details.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3">
                {details.map((d) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {d.label}
                    </div>
                    <div className="min-w-0 flex-1 truncate text-sm text-slate-900">
                      {d.value || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100"
          >
            {cancelText}
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={[
              "rounded-full px-4 py-2 text-sm font-semibold shadow-sm",
              "bg-slate-900 text-white hover:bg-slate-800",
              "focus:outline-none focus:ring-2 focus:ring-slate-300",
              "disabled:cursor-not-allowed disabled:opacity-60",
            ].join(" ")}
          >
            {loading ? "Preparing..." : confirmText}
          </button>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(8px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
