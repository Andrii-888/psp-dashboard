import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type BackButtonProps = {
  href: string;
  label?: string;
  className?: string;
};

export function BackButton({
  href,
  label = "Back",
  className = "",
}: BackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={[
        // Base
        "group inline-flex items-center gap-2",
        "rounded-full border px-3 py-2",
        "text-xs font-semibold",
        "backdrop-blur",
        "transition",
        "active:translate-y-[0.5px]",

        // Apple-like neutral surface (works on dark + light)
        "border-zinc-600/40 bg-zinc-900/70 text-zinc-100",
        "shadow-[0_1px_2px_rgba(0,0,0,0.4)]",

        // Hover / focus
        "hover:bg-zinc-900/85 hover:border-zinc-500/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50",

        className,
      ].join(" ")}
    >
      <ChevronLeft className="h-4 w-4 text-current opacity-80 group-hover:opacity-100" />
      <span className="leading-none">{label}</span>
    </Link>
  );
}
