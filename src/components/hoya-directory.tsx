import Link from "next/link";
import { AlumEmailBar, DirectoryPickToggle } from "@/components/directory-picks";
import { FilterToolbar } from "@/components/filter-toolbar";
import { HoyaAvatar } from "@/components/hoya-avatar";
import { HoyaBadgeRow } from "@/components/hoya-badges";
import { AppIcon } from "@/components/icons";
import { DataTable, StickyTableHeader, Table, TableBody, TableHead, TableRow } from "@/components/data-table";
import { pillClass } from "@/components/page-chrome";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultPagination } from "@/components/result-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableCell } from "@/components/ui/table";
import { displayName, formatCount, positionLabel, resultRange } from "@/lib/format";
import { kindLabel, publicCity, toNameFields } from "@/lib/locker-classify";
import { athleteHref, directoryHref } from "@/lib/locker-paths";
import type { PublicBadge } from "@/lib/badges";
import { isLockerStubId } from "@/lib/locker-stubs";
import { DIRECTORY_PILLS, type DirectoryPill, type LockerPerson } from "@/lib/locker-types";

export function HoyaDirectory({
  q,
  role,
  rows,
  total,
  page,
  pageSize,
  usingSample,
  badgesById = {},
}: {
  q: string;
  role: DirectoryPill;
  rows: LockerPerson[];
  total: number;
  page: number;
  pageSize: number;
  usingSample: boolean;
  badgesById?: Record<string, PublicBadge[]>;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const range = resultRange(page, pageSize, total);
  const noun = role === "all" ? "person" : role.slice(0, -1);
  const plural = role === "all" ? "people" : role;

  return (
    <div className="space-y-5">
      <FilterToolbar
        summary={
          <p className="text-sm text-muted-foreground">
            {range.label}
            {total > 0 ? ` · ${formatCount(total, noun, plural)}` : null}
            {usingSample ? " · sample cards (roster unavailable)" : null}
          </p>
        }
      >
        <form action="/directory" method="get" className="flex flex-col gap-3 sm:flex-row">
          {role !== "all" ? <input type="hidden" name="role" value={role} /> : null}
          <div className="relative min-w-0 flex-1">
            <AppIcon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search name, class, city"
              aria-label="Search directory"
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
          {q || role !== "all" ? (
            <Button asChild type="button" variant="outline">
              <Link href="/directory">Clear</Link>
            </Button>
          ) : null}
        </form>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Directory filters">
          {DIRECTORY_PILLS.map((pill) => {
            const active = pill.id === role;
            return (
              <Link
                key={pill.id}
                href={directoryHref({ q, role: pill.id })}
                role="tab"
                aria-selected={active}
                className={pillClass(active)}
              >
                {pill.label}
              </Link>
            );
          })}
        </div>
      </FilterToolbar>

      {rows.length === 0 ? (
        <EmptyState
          title={q || role !== "all" ? "No matches" : "Directory is empty"}
          body={
            q || role !== "all"
              ? "Try another name or clear the filter."
              : "Roster rows appear here after Neon is connected."
          }
          icon="directory"
          action={
            q || role !== "all" ? (
              <Button asChild variant="outline">
                <Link href="/directory">Clear filters</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {rows.map((person) => {
              const city = publicCity(person);
              const position = positionLabel(person.position);
              return (
                <li key={person.id}>
                  <div className="flex gap-2">
                    <DirectoryPickToggle
                      id={person.id}
                      name={displayName(toNameFields(person))}
                      disabled={isLockerStubId(person.id)}
                    />
                    <Link href={athleteHref(person.id)} className="min-w-0 flex-1">
                      <Card className="h-full transition-shadow hover:shadow-[var(--shadow-elevated)]">
                        <CardContent className="flex gap-3 py-4">
                          <HoyaAvatar person={person} />
                          <div className="min-w-0 space-y-1">
                            <p className="truncate font-medium text-navy">{displayName(toNameFields(person))}</p>
                            <p className="text-sm text-muted-foreground">
                              {[person.classLabel, person.sport, city].filter(Boolean).join(" · ") || person.sport}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="secondary">{kindLabel(person.kind)}</Badge>
                              {position ? <Badge variant="outline">{position}</Badge> : null}
                            </div>
                            <HoyaBadgeRow badges={badgesById[person.id] ?? []} />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          <DataTable className="hidden md:block" caption="Directory results">
            <Table container={false}>
              <StickyTableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-[1] w-10 bg-card"> </TableHead>
                  <TableHead className="sticky left-10 z-[1] min-w-48 bg-card">Name</TableHead>
                  <TableHead>Class / sport</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Badges</TableHead>
                  <TableHead>Position</TableHead>
                </TableRow>
              </StickyTableHeader>
              <TableBody>
                {rows.map((person) => {
                  const city = publicCity(person);
                  const position = positionLabel(person.position);
                  return (
                    <TableRow key={person.id}>
                      <TableCell className="sticky left-0 z-[1] bg-card">
                        <DirectoryPickToggle
                          id={person.id}
                          name={displayName(toNameFields(person))}
                          disabled={isLockerStubId(person.id)}
                        />
                      </TableCell>
                      <TableCell className="sticky left-10 z-[1] bg-card">
                        <Link href={athleteHref(person.id)} className="flex items-center gap-2 font-medium text-navy hover:underline">
                          <HoyaAvatar person={person} size="sm" />
                          <span className="truncate">{displayName(toNameFields(person))}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[person.classLabel, person.sport].filter(Boolean).join(" · ")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{city}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{kindLabel(person.kind)}</Badge>
                      </TableCell>
                      <TableCell>
                        <HoyaBadgeRow badges={badgesById[person.id] ?? []} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{position}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTable>
        </>
      )}

      <ResultPagination page={page} pageCount={pageCount} hrefFor={(next) => directoryHref({ q, role, page: next })} />
      <AlumEmailBar />
    </div>
  );
}
