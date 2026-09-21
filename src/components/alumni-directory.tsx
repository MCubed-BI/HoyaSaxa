"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSelection } from "@/components/selection-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultPagination } from "@/components/result-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HoyaBadgeRow } from "@/components/hoya-badges";
import type { PublicBadge } from "@/lib/badges";
import { filtersToSearchParams, type AlumniFilters } from "@/lib/filters";
import {
  classYearLabel,
  displayName,
  formatCount,
  initials,
  jobLabel,
  locationLabel,
  positionLabel,
  residenceLabel,
  resultRange,
} from "@/lib/format";
import type { AlumniListItem } from "@/lib/types";

function ContactPills({ person }: { person: AlumniListItem }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {person.email_primary ? (
        <Badge variant="secondary" className="font-normal">
          Email
        </Badge>
      ) : null}
      {person.phone_primary ? (
        <Badge variant="secondary" className="font-normal">
          Phone
        </Badge>
      ) : null}
      {person.linkedin_url ? (
        <Badge variant="secondary" className="font-normal">
          LinkedIn
        </Badge>
      ) : null}
    </div>
  );
}

export function AlumniDirectory({
  rows,
  total,
  page,
  pageSize,
  filters,
  badgesById = {},
  focusId,
}: {
  rows: AlumniListItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: AlumniFilters;
  badgesById?: Record<string, PublicBadge[]>;
  focusId?: string | null;
}) {
  const { isSelected, toggle } = useSelection();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hrefFor = (next: number) => {
    const qs = filtersToSearchParams(filters, next).toString();
    return qs ? `/?${qs}` : "/";
  };
  const range = resultRange(page, pageSize, total);
  const highlightId = focusId || (total === 1 ? rows[0]?.id : null);

  useEffect(() => {
    if (!highlightId) return;
    document.getElementById(`person-${highlightId}`)?.scrollIntoView({ block: "center" });
  }, [highlightId]);

  if (total === 0) {
    return (
      <EmptyState
        title="No alumni match this search"
        body="Try a name or preferred name, or clear filters to see the full directory."
        icon="directory"
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {range.label} · {formatCount(total, "alumnus", "alumni")}
        {filters.q ? ` · matching “${filters.q}”` : null}
      </p>

      <ul className="grid gap-3">
        {rows.map((person) => {
          const highlighted = person.id === highlightId;
          return (
            <li key={person.id} id={`person-${person.id}`}>
              <Card
                className={
                  highlighted
                    ? "border-navy/60 ring-2 ring-navy/20"
                    : isSelected(person.id)
                      ? "border-navy/40"
                      : ""
                }
              >
                <CardContent className="flex gap-3 py-4">
                  <input
                    type="checkbox"
                    checked={isSelected(person.id)}
                    onChange={() => toggle(person.id)}
                    className="mt-1 size-4 rounded border-input accent-navy"
                    aria-label={`Select ${displayName(person)} for blast`}
                  />
                  <Link href={`/alumni/${person.id}`} className="flex min-w-0 flex-1 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                      {initials(person)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium text-navy hover:underline">{displayName(person)}</p>
                      <p className="text-sm text-muted-foreground">
                        {[positionLabel(person.position), classYearLabel(person.class_year) || person.seasons]
                          .filter(Boolean)
                          .join(" · ") || "Roster details pending"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {jobLabel(person.company_name, person.job_title) ||
                          residenceLabel(person) ||
                          locationLabel(person.hometown_city, person.hometown_state) ||
                          "Location unknown"}
                      </p>
                      <HoyaBadgeRow badges={badgesById[person.id] ?? []} />
                      <ContactPills person={person} />
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <ResultPagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
    </div>
  );
}
