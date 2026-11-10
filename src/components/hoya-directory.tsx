import Link from "next/link";
import { AlumEmailBar, DirectoryPickToggle } from "@/components/directory-picks";
import { DirectoryNameSearch } from "@/components/directory-name-search";
import { ProfileMessageCta } from "@/components/profile-message-cta";
import { DirectoryFocus } from "@/components/directory-focus";
import { FilterToolbar } from "@/components/filter-toolbar";
import { HoyaAvatar } from "@/components/hoya-avatar";
import { HoyaBadgeRow } from "@/components/hoya-badges";
import { pillClass } from "@/components/page-chrome";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultPagination } from "@/components/result-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { displayName, formatCount, positionLabel, resultRange } from "@/lib/format";
import { kindLabel, publicCity, toNameFields } from "@/lib/locker-classify";
import { athleteHref, directoryHref } from "@/lib/locker-paths";
import type { PublicBadge } from "@/lib/badges";
import { isLockerStubId } from "@/lib/locker-stubs";
import { DIRECTORY_PILLS, type DirectoryPill, type LockerPerson } from "@/lib/locker-types";
import { canMessageActorTarget, type MessageCtaActor } from "@/lib/messages-dm";

export function HoyaDirectory({
  q,
  role,
  rows,
  total,
  page,
  pageSize,
  usingSample,
  badgesById = {},
  focusId,
  messageActor = null,
}: {
  q: string;
  role: DirectoryPill;
  rows: LockerPerson[];
  total: number;
  page: number;
  pageSize: number;
  usingSample: boolean;
  badgesById?: Record<string, PublicBadge[]>;
  focusId?: string | null;
  messageActor?: MessageCtaActor | null;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const range = resultRange(page, pageSize, total);
  const noun = role === "all" ? "person" : role.slice(0, -1);
  const plural = role === "all" ? "people" : role;
  const highlightId = focusId || (total === 1 ? rows[0]?.id : null);

  return (
    <div className="space-y-5">
      <FilterToolbar
        summary={
          <p className="text-sm text-muted-foreground">
            {range.label}
            {total > 0 ? ` · ${formatCount(total, noun, plural)}` : null}
            {q ? ` · matching “${q}”` : null}
            {usingSample ? " · sample cards (roster unavailable)" : null}
          </p>
        }
      >
        <form action="/directory" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {role !== "all" ? <input type="hidden" name="role" value={role} /> : null}
          <DirectoryNameSearch defaultValue={q} view="alum" />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="h-11 px-4">
              Find
            </Button>
            {q || role !== "all" ? (
              <Button asChild type="button" variant="outline" className="h-11">
                <Link href="/directory">Clear</Link>
              </Button>
            ) : null}
          </div>
        </form>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Directory role">
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
              ? "Try another name or preferred name, or clear the filter."
              : "Roster rows appear here after Neon is connected."
          }
          icon="directory"
          action={
            q || role !== "all" ? (
              <Button asChild variant="outline">
                <Link href="/directory">Clear search</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((person) => {
            const city = publicCity(person);
            const position = positionLabel(person.position);
            const highlighted = person.id === highlightId;
            const name = displayName(toNameFields(person));
            const showMessage = canMessageActorTarget(messageActor, person.id);
            return (
              <li key={person.id} id={`person-${person.id}`}>
                <div className="flex gap-2">
                  <DirectoryPickToggle
                    id={person.id}
                    name={name}
                    disabled={isLockerStubId(person.id)}
                  />
                  <Card
                    className={`min-w-0 flex-1 transition-shadow hover:shadow-[var(--shadow-elevated)] ${
                      highlighted ? "border-navy/60 ring-2 ring-navy/20" : ""
                    }`}
                  >
                    <CardContent className="flex gap-3 py-4">
                      <Link href={athleteHref(person.id)} className="flex min-w-0 flex-1 gap-3">
                        <HoyaAvatar person={person} />
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-medium text-navy hover:underline">{name}</p>
                          <p className="text-sm text-muted-foreground">
                            {[person.classLabel, person.sport, city].filter(Boolean).join(" · ") || person.sport}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary">{kindLabel(person.kind)}</Badge>
                            {position ? <Badge variant="outline">{position}</Badge> : null}
                          </div>
                          <HoyaBadgeRow badges={badgesById[person.id] ?? []} />
                        </div>
                      </Link>
                      {showMessage ? <ProfileMessageCta alumniId={person.id} name={name} compact /> : null}
                    </CardContent>
                  </Card>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DirectoryFocus id={highlightId} />
      <ResultPagination page={page} pageCount={pageCount} hrefFor={(next) => directoryHref({ q, role, page: next })} />
      <AlumEmailBar />
    </div>
  );
}
