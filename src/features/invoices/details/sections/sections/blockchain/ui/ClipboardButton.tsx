"use client";

import { useEffect, useState } from "react";

type ClipboardButtonProps = {
  title: string;
  value: string;
  disabled?: boolean;
  className?: string;
  copiedText?: string;
  copyText?: string;
};

export function ClipboardButton({
  title,
  value,
  disabled,
  className,
  copiedText = "Copied",
  copyText = "Copy",
}: ClipboardButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    if (disabled) return;
    if (!value) return;

    let ok = false;

    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }

    setCopied(ok);
  };

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled || !value}
      title={title}
      className={[
        // ChatGPT-like pill
        "inline-flex items-center justify-center rounded-full border px-3 py-1",
        "text-[11px] font-medium shadow-sm transition select-none",
        "border-slate-200/80 bg-slate-50 text-slate-800",
        "hover:bg-white hover:border-slate-300/80",
        "active:bg-slate-100",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className ?? "",
      ].join(" ")}
    >
      {copied ? copiedText : copyText}
    </button>
  );
}
