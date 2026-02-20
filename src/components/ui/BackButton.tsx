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
        "rounded-full border px-3 py-1.5",
        "text-xs font-medium leading-none",
        "transition",
        "active:translate-y-[0.5px]",
        "focus-visible:outline-none focus-visible:ring-2",

        // Light theme (visible on white)
        "border-zinc-300 bg-white text-zinc-900",
        "hover:bg-zinc-50 hover:border-zinc-400",
        "focus-visible:ring-zinc-400/40",

        // Dark theme (visible on apple-card)
        "dark:border-white/20 dark:bg-white/10 dark:text-white",
        "dark:hover:bg-white/15 dark:hover:border-white/30",
        "dark:focus-visible:ring-white/25",

        className,
      ].join(" ")}
    >
      <ChevronLeft className="h-4 w-4 text-current opacity-80 group-hover:opacity-100" />
      <span className="leading-none">{label}</span>
    </Link>
  );
}
