"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

type Props = {
  value: string;
  label?: string; // aria-label
  className?: string;
  size?: "sm" | "md";
  showText?: boolean; // optional inline text mode
  tooltip?: boolean; // hover tooltip like ChatGPT
};

function Tooltip({
  anchorEl,
  text,
  visible,
}: {
  anchorEl: HTMLElement | null;
  text: string;
  visible: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [pos, setPos] = React.useState<{ left: number; top: number } | null>(
    null
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!visible || !anchorEl) return;

    const update = () => {
      const r = anchorEl.getBoundingClientRect();
      // bottom centered
      const left = r.left + r.width / 2;
      const top = r.bottom + 8; // spacing
      setPos({ left, top });
    };

    update();

    // keep in sync on scroll/resize
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [visible, anchorEl]);

  if (!mounted || !visible || !anchorEl || !pos) return null;

  return createPortal(
    <div
      className={[
        "pointer-events-none fixed z-9999",
        "rounded-md px-2 py-1 text-[11px] font-medium",
        "border shadow-lg",
        "bg-zinc-900 text-white border-zinc-800",
        "whitespace-nowrap",
        "transition-opacity duration-150",
      ].join(" ")}
      style={{
        left: pos.left,
        top: pos.top,
        transform: "translateX(-50%)",
      }}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>,
    document.body
  );
}

export function CopyButton({
  value,
  label = "Copy",
  className = "",
  size = "sm",
  showText = false,
  tooltip = true,
}: Props) {
  const [copied, setCopied] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);

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
  const tooltipText = copied ? "Copied" : "Copy";
  const showTooltip = tooltip && hovered && !showText;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={onCopy}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={label}
        className={[
          "inline-flex items-center justify-center",
          "rounded-md transition",
          "active:scale-95",
          "focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-slate-600/60",

          // No ugly white box — subtle premium hover
          "text-zinc-500 hover:text-zinc-900 hover:bg-black/5",
          "dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/10",

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

      <Tooltip
        anchorEl={btnRef.current}
        text={tooltipText}
        visible={showTooltip}
      />
    </>
  );
}
