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
        // Base: always readable on both light/dark backgrounds
        "group inline-flex items-center gap-2",
        "rounded-full border px-3 py-2",
        "text-xs font-semibold",
        "backdrop-blur",
        "transition",
        // Default look (works on white AND dark)
        "border-zinc-300/70 bg-white/85 text-zinc-900",
        "shadow-sm",
        // Hover/focus: never “wash out”
        "hover:bg-white hover:border-zinc-400/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/60",
        "active:translate-y-[0.5px]",
        className,
      ].join(" ")}
    >
      {/* Icon must follow current text color */}
      <ChevronLeft className="h-4 w-4 text-current opacity-80 group-hover:opacity-100" />
      <span className="leading-none text-current">{label}</span>
    </Link>
  );
}
