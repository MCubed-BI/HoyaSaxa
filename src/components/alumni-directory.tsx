"use client";

import Link from "next/link";
import { useSelection } from "@/components/selection-provider";
import { DataTable, StickyTableHeader, Table, TableBody, TableHead, TableRow } from "@/components/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultPagination } from "@/components/result-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TableCell } from "@/components/ui/table";
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
}: {
  rows: AlumniListItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: AlumniFilters;
  badgesById?: Record<string, PublicBadge[]>;
}) {
  const { isSelected, toggle } = useSelection();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hrefFor = (next: number) => {
    const qs = filtersToSearchParams(filters, next).toString();
    return qs ? `/?${qs}` : "/";
  };
  const range = resultRange(page, pageSize, total);
  const pageSelected = rows.every((person) => isSelected(person.id));

  if (total === 0) {
    return (
      <EmptyState
        title="No alumni match these filters"
        body="Try a broader search, or clear filters to see the full directory."
        icon="directory"
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {range.label} · {formatCount(total, "alumnus", "alumni")}
      </p>

      <div className="grid gap-3 md:hidden">
        {rows.map((person) => (
          <Card key={person.id} className={isSelected(person.id) ? "border-navy/50" : ""}>
            <CardContent className="flex gap-3 py-4">
              <input
                type="checkbox"
                checked={isSelected(person.id)}
                onChange={() => toggle(person.id)}
                className="mt-1 size-4 rounded border-input accent-navy"
                aria-label={`Select ${displayName(person)}`}
              />
              <Link href={`/alumni/${person.id}`} className="flex min-w-0 flex-1 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                  {initials(person)}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium text-navy">{displayName(person)}</p>
                  <p className="text-sm text-muted-foreground">
                    {[positionLabel(person.position), classYearLabel(person.class_year) || person.seasons]
                      .filter(Boolean)
                      .join(" · ") || "Roster details pending"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {jobLabel(person.company_name, person.job_title) ||
                      residenceLabel(person) ||
                      "Location unknown"}
                  </p>
                  <HoyaBadgeRow badges={badgesById[person.id] ?? []} />
                  <ContactPills person={person} />
                </div>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <DataTable className="hidden md:block" caption="Staff directory">
        <Table container={false}>
          <StickyTableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-[1] w-10 bg-card">
                <input
                  type="checkbox"
                  checked={pageSelected && rows.length > 0}
                  onChange={() => {
                    rows.forEach((person) => {
                      if (pageSelected ? isSelected(person.id) : !isSelected(person.id)) {
                        toggle(person.id);
                      }
                    });
                  }}
                  aria-label="Select this page"
                  className="size-4 rounded border-input accent-navy"
                />
              </TableHead>
              <TableHead className="sticky left-10 z-[1] min-w-44 bg-card">Name</TableHead>
              <TableHead>Position / seasons</TableHead>
              <TableHead>Hometown</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Work</TableHead>
              <TableHead>Badges</TableHead>
              <TableHead>Contact</TableHead>
            </TableRow>
          </StickyTableHeader>
          <TableBody>
            {rows.map((person) => (
              <TableRow key={person.id} className={isSelected(person.id) ? "bg-muted/60" : undefined}>
                <TableCell className="sticky left-0 z-[1] bg-card">
                  <input
                    type="checkbox"
                    checked={isSelected(person.id)}
                    onChange={() => toggle(person.id)}
                    aria-label={`Select ${displayName(person)}`}
                    className="size-4 rounded border-input accent-navy"
                  />
                </TableCell>
                <TableCell className="sticky left-10 z-[1] bg-card">
                  <Link href={`/alumni/${person.id}`} className="font-medium text-navy hover:underline">
                    {displayName(person)}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[positionLabel(person.position), classYearLabel(person.class_year) || person.seasons]
                    .filter(Boolean)
                    .join(" · ")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {locationLabel(person.hometown_city, person.hometown_state)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {locationLabel(person.current_city, person.current_state)}
                </TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground">
                  {jobLabel(person.company_name, person.job_title) || "—"}
                </TableCell>
                <TableCell>
                  <HoyaBadgeRow badges={badgesById[person.id] ?? []} />
                </TableCell>
                <TableCell>
                  <ContactPills person={person} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTable>

      <ResultPagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
    </div>
  );
}
