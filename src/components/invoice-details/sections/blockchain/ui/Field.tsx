"use client";

import { ClipboardButton } from "./ClipboardButton";

type FieldProps = {
  label: string;
  value?: string | number | null;
  emptyText?: string;
  mono?: boolean;
  copyValue?: string | null;
};

export function Field({
  label,
  value,
  emptyText = "—",
  mono = false,
  copyValue,
}: FieldProps) {
  const hasValue =
    value !== null &&
    value !== undefined &&
    (typeof value === "number" || String(value).trim().length > 0);

  const display = hasValue ? String(value) : emptyText;

  return (
    <div className="rounded-2xl bg-slate-950/50 p-3 ring-1 ring-slate-800/80">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>

        {copyValue && copyValue.trim().length > 0 ? (
          <ClipboardButton title={`Copy ${label}`} value={copyValue} />
        ) : null}
      </div>

      <p
        className={[
          "mt-1 break-all text-[12px] text-slate-100",
          mono ? "font-mono text-[11px]" : "",
        ].join(" ")}
      >
        {display}
      </p>
    </div>
  );
}
