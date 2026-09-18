import Link from "next/link";
import { HoyaAvatar } from "@/components/hoya-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { displayName } from "@/lib/format";
import { kindLabel, publicCity, toNameFields } from "@/lib/locker-classify";
import { searchLockerDirectory } from "@/lib/locker-data";
import { athleteHref, directoryHref, parseDirectoryPill, parseLockerPage } from "@/lib/locker-paths";
import { DIRECTORY_PILLS } from "@/lib/locker-types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Legacy Locker",
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
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">Hoya Directory</p>
        <h1 className="font-heading text-3xl text-white">The roster</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search by name, class, or city. Cards show photo, class, sport, and city.
        </p>
      </div>

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
              className={`rounded-full border px-3 py-1 text-sm ${
                active
                  ? "border-gold bg-gold text-gold-foreground"
                  : "border-gold/35 bg-card text-foreground hover:border-gold/70"
              }`}
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
                  <Card className="h-full ring-gold/20 hover:ring-gold/45">
                    <CardContent className="flex gap-3 py-4">
                      <HoyaAvatar person={person} />
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-medium text-white">{displayName(toNameFields(person))}</p>
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
            <Link href={directoryHref({ q, role, page: result.page - 1 })} className="text-gold hover:underline">
              Previous
            </Link>
          ) : (
            <span className="text-muted-foreground">Previous</span>
          )}
          {result.page < pageCount ? (
            <Link href={directoryHref({ q, role, page: result.page + 1 })} className="text-gold hover:underline">
              Next
            </Link>
          ) : (
            <span className="text-muted-foreground">Next</span>
          )}
        </div>
      ) : null}
    </main>
  );
}
