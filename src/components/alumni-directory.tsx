"use client";

import Link from "next/link";
import { useSelection } from "@/components/selection-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { filtersToSearchParams, type AlumniFilters } from "@/lib/filters";
import { displayName, initials, jobLabel, locationLabel } from "@/lib/format";
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
}: {
  rows: AlumniListItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: AlumniFilters;
}) {
  const { isSelected, toggle } = useSelection();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const prev = page > 1 ? `/?${filtersToSearchParams(filters, page - 1).toString()}` : null;
  const next = page < pageCount ? `/?${filtersToSearchParams(filters, page + 1).toString()}` : null;
  const pageSelected = rows.every((person) => isSelected(person.id));

  if (total === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-heading text-xl text-navy">No alumni match these filters</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a broader search, or clear filters to see the full directory.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} alumni
          {pageCount > 1 ? ` · page ${page} of ${pageCount}` : null}
        </p>
      </div>

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
                    {[person.position, person.class_year || person.seasons].filter(Boolean).join(" · ") ||
                      "Roster details pending"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {jobLabel(person.company_name, person.job_title) ||
                      locationLabel(person.current_city, person.current_state) ||
                      locationLabel(person.hometown_city, person.hometown_state) ||
                      "Location unknown"}
                  </p>
                  <ContactPills person={person} />
                </div>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
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
              <TableHead>Name</TableHead>
              <TableHead>Position / seasons</TableHead>
              <TableHead>Hometown</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Work</TableHead>
              <TableHead>Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((person) => (
              <TableRow key={person.id} className={isSelected(person.id) ? "bg-muted/60" : undefined}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={isSelected(person.id)}
                    onChange={() => toggle(person.id)}
                    aria-label={`Select ${displayName(person)}`}
                    className="size-4 rounded border-input accent-navy"
                  />
                </TableCell>
                <TableCell>
                  <Link href={`/alumni/${person.id}`} className="font-medium text-navy hover:underline">
                    {displayName(person)}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[person.position, person.class_year ? `Class ${person.class_year}` : person.seasons]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {locationLabel(person.hometown_city, person.hometown_state) || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {locationLabel(person.current_city, person.current_state) || "—"}
                </TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground">
                  {jobLabel(person.company_name, person.job_title) || "—"}
                </TableCell>
                <TableCell>
                  <ContactPills person={person} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

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
