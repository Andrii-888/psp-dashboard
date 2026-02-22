"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

type Props = {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
  showText?: boolean; // optional text mode
};

export function CopyButton({
  value,
  label = "Copy",
  className = "",
  size = "sm",
  showText = false,
}: Props) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  async function onCopy() {
    const v = String(value ?? "").trim();
    if (!v) return;

    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      toast.success("Copied");

      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1000);
    } catch {
      toast.error("Copy failed");
    }
  }

  const sizeStyles = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className={[
        "inline-flex items-center justify-center",
        "rounded-md transition",
        "active:scale-95",
        "focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-slate-600/60",

        // Light
        "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",

        // Dark
        "dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50",

        sizeStyles,
        className,
      ].join(" ")}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}

      {showText && (
        <span className="ml-2 text-xs font-medium">
          {copied ? "Copied" : "Copy"}
        </span>
      )}
    </button>
  );
}
