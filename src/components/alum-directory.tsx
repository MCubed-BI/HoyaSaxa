import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { filtersToSearchParams, type AlumniFilters } from "@/lib/filters";
import {
  classYearLabel,
  displayName,
  initials,
  jobLabel,
  locationLabel,
  positionLabel,
  residenceLabel,
} from "@/lib/format";
import type { AlumniListItem } from "@/lib/types";

export function AlumDirectory({
  rows,
  total,
  page,
  pageSize,
  filters,
  basePath = "/alum",
  profileHref = "/portal/profile",
}: {
  rows: AlumniListItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: AlumniFilters;
  basePath?: string;
  profileHref?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const prev = page > 1 ? `${basePath}?${filtersToSearchParams(filters, page - 1).toString()}` : null;
  const next = page < pageCount ? `${basePath}?${filtersToSearchParams(filters, page + 1).toString()}` : null;

  if (total === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-heading text-xl text-navy">No alumni match this lookup</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a name, class year, or city. Contact details stay hidden on alumnus cards.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total.toLocaleString()} alumni
        {pageCount > 1 ? ` · page ${page} of ${pageCount}` : null}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((person) => (
          <Card key={person.id}>
            <CardContent className="flex gap-3 py-4">
              <Link
                href={profileHref}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white"
              >
                {initials(person)}
              </Link>
              <div className="min-w-0 space-y-1">
                <Link href={profileHref} className="truncate font-medium text-navy hover:underline">
                  {displayName(person)}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {[positionLabel(person.position), classYearLabel(person.class_year) || person.seasons]
                    .filter(Boolean)
                    .join(" · ") || "Roster details pending"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {jobLabel(person.company_name, person.job_title) || residenceLabel(person) || "Location unknown"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {locationLabel(person.current_city, person.current_state) ? (
                    <Badge variant="secondary" className="font-normal">
                      {locationLabel(person.current_city, person.current_state)}
                    </Badge>
                  ) : null}
                  {person.linkedin_url ? (
                    <Badge variant="secondary" className="font-normal">
                      LinkedIn on file
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm">
          {prev ? (
            <Link href={prev} className="text-navy hover:underline">
              Previous
            </Link>
          ) : (
            <span className="text-muted-foreground">Previous</span>
          )}
          {next ? (
            <Link href={next} className="text-navy hover:underline">
              Next
            </Link>
          ) : (
            <span className="text-muted-foreground">Next</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
