import Link from "next/link";
import { cn } from "cn";
import { formatNumber, pageWindow } from "@/lib/format";

export function ResultPagination({
  page,
  pageCount,
  hrefFor,
  className,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  const pages = pageWindow(page, pageCount);

  return (
    <nav className={cn("flex flex-wrap items-center justify-between gap-3 text-sm", className)} aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="font-medium text-navy hover:underline">
          Previous
        </Link>
      ) : (
        <span className="text-muted-foreground">Previous</span>
      )}
      <ol className="flex flex-wrap items-center gap-1">
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <li key={`e-${index}`} className="px-1 text-muted-foreground" aria-hidden>
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  "inline-flex min-w-8 items-center justify-center rounded-md px-2 py-1 font-medium",
                  item === page ? "bg-navy text-white" : "text-navy hover:bg-muted",
                )}
              >
                {formatNumber(item)}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className="font-medium text-navy hover:underline">
          Next
        </Link>
      ) : (
        <span className="text-muted-foreground">Next</span>
      )}
    </nav>
  );
}
