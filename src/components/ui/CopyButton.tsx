"use client";

import * as React from "react";
import { toast } from "sonner";

type Props = {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
};

export function CopyButton({
  value,
  label = "Copy to clipboard",
  className = "",
  size = "sm",
}: Props) {
  const [state, setState] = React.useState<"idle" | "copied" | "error">("idle");
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  async function onCopy() {
    const v = String(value ?? "").trim();

    if (!v) {
      setState("error");
      toast.error("Nothing to copy");
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setState("idle"), 1200);
      return;
    }

    try {
      await navigator.clipboard.writeText(v);
      setState("copied");
      toast.success(`Copied: ${v.slice(0, 32)}${v.length > 32 ? "…" : ""}`);
    } catch {
      // Fallback for older browsers / permissions
      try {
        const el = document.createElement("textarea");
        el.value = v;
        el.setAttribute("readonly", "true");
        el.style.position = "fixed";
        el.style.top = "-1000px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);

        setState("copied");
        toast.success(`Copied: ${v.slice(0, 32)}${v.length > 32 ? "…" : ""}`);
      } catch {
        setState("error");
        toast.error("Copy failed");
      }
    }

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setState("idle"), 1200);
  }

  const pad = size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm";

  const text =
    state === "copied" ? "Copied" : state === "error" ? "Error" : "Copy";

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className={[
        "inline-flex items-center justify-center rounded-lg",
        "border border-zinc-200 bg-white text-zinc-900 shadow-sm",
        "hover:bg-zinc-50 active:bg-zinc-100",
        "focus:outline-none focus:ring-2 focus:ring-zinc-200",
        "transition",
        pad,
        className,
      ].join(" ")}
    >
      {text}
    </button>
  );
}
