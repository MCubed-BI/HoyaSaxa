import Link from "next/link";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";
import { cn } from "cn";

export function BrandMark({
  href,
  title = PRODUCT_DISPLAY_NAME,
  eyebrow,
  inverted = false,
  compact = false,
}: {
  href: string;
  title?: string;
  eyebrow?: string;
  inverted?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      title={title}
      aria-label={title}
      className={cn(
        "group flex items-center gap-3 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50",
        compact ? "shrink-0" : "min-w-0",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg font-semibold tracking-tight ring-1",
          compact ? "size-8 text-[13px]" : "size-9 text-sm",
          inverted
            ? "bg-white text-navy ring-white/20"
            : "bg-navy text-white shadow-[var(--shadow-xs)] ring-gold/70",
        )}
      >
        HS
      </span>
      <span className="min-w-0">
        {eyebrow ? (
          <span
            className={cn(
              "block text-[10px] font-medium uppercase tracking-[0.14em]",
              inverted ? "text-white/55" : "text-muted-foreground",
            )}
          >
            {eyebrow}
          </span>
        ) : null}
        <span
          className={cn(
            "block font-heading tracking-tight",
            compact
              ? "max-w-[9.75rem] text-[13px] leading-snug sm:max-w-[11.5rem] sm:text-sm"
              : "text-xl leading-tight",
            inverted ? "text-white" : "text-navy",
          )}
        >
          {title}
        </span>
      </span>
    </Link>
  );
}
