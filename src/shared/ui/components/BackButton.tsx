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
        "group inline-flex items-center justify-center",
        "h-9 w-9 rounded-full",
        "transition-all duration-200",
        "active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2",

        // Light theme (ChatGPT-like on white)
        "bg-white border border-zinc-200 text-zinc-700",
        "shadow-sm",
        "hover:bg-zinc-50 hover:border-zinc-300 hover:shadow",
        "focus-visible:ring-zinc-400/40",

        // Dark theme (glass subtle)
        "dark:bg-white/10 dark:border-white/15 dark:text-white",
        "dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]",
        "dark:hover:bg-white/15 dark:hover:border-white/25",
        "dark:focus-visible:ring-white/25",

        className,
      ].join(" ")}
    >
      <ChevronLeft className="h-4 w-4 opacity-80 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
