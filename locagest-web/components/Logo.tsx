import { cn } from "@/lib/cn";

/** Logo LocaGest : maison stylisée + nom. */
export function Logo({ className, light = false, withText = true }: { className?: string; light?: boolean; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" fill={light ? "#ffffff" : "#1e4d7b"} />
        <path d="M32 13 12 29.5V51a2 2 0 0 0 2 2h13V40h10v13h13a2 2 0 0 0 2-2V29.5L32 13Z" fill={light ? "#1e4d7b" : "#ffffff"} />
        <circle cx="32" cy="30" r="4.5" fill="#2f78b8" />
      </svg>
      {withText && (
        <span className={cn("text-lg font-bold tracking-tight", light ? "text-white" : "text-slate-900")}>
          Loca<span className={light ? "text-brand-200" : "text-brand-600"}>Gest</span>
        </span>
      )}
    </span>
  );
}
