import Image from "next/image";
import Link from "next/link";
import { BRAND_MARK_HEIGHT, BRAND_MARK_SRC, BRAND_MARK_WIDTH, PRODUCT_DISPLAY_NAME } from "@/lib/product";
import { cn } from "cn";

/** Presentation wrap only — not a display alias. Line 1 + space + line 2 === PRODUCT_DISPLAY_NAME. */
const WORDMARK_LINE_1 = "Georgetown Football";

function wordmarkLines(title: string): [string, string] | null {
  if (title !== PRODUCT_DISPLAY_NAME) return null;
  if (!title.startsWith(`${WORDMARK_LINE_1} `)) return null;
  return [WORDMARK_LINE_1, title.slice(WORDMARK_LINE_1.length + 1)];
}

export function BrandMark({
  href,
  title = PRODUCT_DISPLAY_NAME,
  eyebrow,
  inverted = false,
  compact = false,
  prominent = false,
}: {
  href: string;
  title?: string;
  eyebrow?: string;
  inverted?: boolean;
  compact?: boolean;
  prominent?: boolean;
}) {
  const lines = wordmarkLines(title);
  const markPx = prominent ? 88 : compact ? 36 : 40;

  return (
    <Link
      href={href}
      title={title}
      aria-label={title}
      className={cn(
        "group flex max-w-full min-w-0 items-center rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50",
        prominent ? "w-full flex-col gap-3 text-center" : "w-full gap-3",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white",
          prominent ? "size-[5.5rem] p-1.5 ring-1 ring-white/25" : compact ? "size-9 p-0.5" : "size-10 p-0.5",
          inverted
            ? "ring-1 ring-white/25"
            : "shadow-[var(--shadow-xs)] ring-1 ring-silver/80",
        )}
      >
        <Image
          src={BRAND_MARK_SRC}
          alt=""
          width={BRAND_MARK_WIDTH}
          height={BRAND_MARK_HEIGHT}
          sizes={`${markPx}px`}
          className="h-full w-full object-contain"
          priority
        />
      </span>
      <span className={cn("min-w-0", prominent && "flex flex-col items-center")}>
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
        {lines ? (
          <span
            aria-hidden
            className={cn(
              "brand-wordmark font-heading tracking-tight",
              compact ? "brand-wordmark--inline-wide text-[15px] leading-tight sm:text-base" : "text-xl leading-tight",
              inverted ? "text-white" : "text-navy",
              prominent && "items-center",
            )}
          >
            <span className="brand-wordmark__line">{lines[0]}</span>
            <span className="brand-wordmark__line">{lines[1]}</span>
          </span>
        ) : (
          <span
            className={cn(
              "block font-heading tracking-tight",
              compact ? "text-[15px] leading-tight sm:text-base" : "text-xl leading-tight",
              inverted ? "text-white" : "text-navy",
            )}
          >
            {title}
          </span>
        )}
      </span>
    </Link>
  );
}
