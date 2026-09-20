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
      className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50"
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
            compact ? "text-[15px] leading-tight sm:text-base" : "text-xl leading-tight",
            inverted ? "text-white" : "text-navy",
          )}
        >
          {title}
        </span>
      </span>
    </Link>
  );
}
