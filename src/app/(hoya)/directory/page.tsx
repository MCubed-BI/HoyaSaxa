import Link from "next/link";
import { HoyaAvatar } from "@/components/hoya-avatar";
import { PageHeader, PageMain, pillClass } from "@/components/page-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { displayName } from "@/lib/format";
import { kindLabel, publicCity, toNameFields } from "@/lib/locker-classify";
import { searchLockerDirectory } from "@/lib/locker-directory";
import { athleteHref, directoryHref, parseDirectoryPill, parseLockerPage } from "@/lib/locker-paths";
import { DIRECTORY_PILLS } from "@/lib/locker-types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Directory",
  description: "Hoya Football directory — athletes, alumni, coaches, and staff.",
};

function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q);
  const role = parseDirectoryPill(firstParam(params.role));
  const page = parseLockerPage(firstParam(params.page));
  const result = await searchLockerDirectory({ q, role, page });
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <PageMain width="record">
      <PageHeader
        eyebrow="Hoya Directory"
        title="The roster"
        description="Search by name, class, or city. Cards show photo, class, sport, and city."
      />

      <form action="/directory" method="get" className="flex flex-col gap-3 sm:flex-row">
        {role !== "all" ? <input type="hidden" name="role" value={role} /> : null}
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name, class, city"
          aria-label="Search directory"
        />
        <Button type="submit">Search</Button>
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

      <p className="text-sm text-muted-foreground">
        {result.total.toLocaleString()} {role === "all" ? "people" : role}
        {result.usingSample ? " · sample cards (roster unavailable)" : null}
        {pageCount > 1 ? ` · page ${result.page} of ${pageCount}` : null}
      </p>

      {result.rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No matches. Try another name or clear the filter.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {result.rows.map((person) => {
            const city = publicCity(person);
            return (
              <li key={person.id}>
                <Link href={athleteHref(person.id)} className="block">
                  <Card className="h-full transition-shadow hover:shadow-[var(--shadow-elevated)]">
                    <CardContent className="flex gap-3 py-4">
                      <HoyaAvatar person={person} />
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-medium text-navy">{displayName(toNameFields(person))}</p>
                        <p className="text-sm text-muted-foreground">
                          {[person.classLabel, person.sport, city].filter(Boolean).join(" · ") ||
                            person.sport}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{kindLabel(person.kind)}</Badge>
                          {person.position ? <Badge variant="outline">{person.position}</Badge> : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm">
          {result.page > 1 ? (
            <Link href={directoryHref({ q, role, page: result.page - 1 })} className="font-medium text-navy hover:underline">
              Previous
            </Link>
          ) : (
            <span className="text-muted-foreground">Previous</span>
          )}
          {result.page < pageCount ? (
            <Link href={directoryHref({ q, role, page: result.page + 1 })} className="font-medium text-navy hover:underline">
              Next
            </Link>
          ) : (
            <span className="text-muted-foreground">Next</span>
          )}
        </div>
      ) : null}
    </PageMain>
  );
}
