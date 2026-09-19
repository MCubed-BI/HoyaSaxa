import Link from "next/link";
import { notFound } from "next/navigation";
import { HoyaAvatar } from "@/components/hoya-avatar";
import { PageMain, pillClass } from "@/components/page-chrome";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayName, jobLabel } from "@/lib/format";
import { kindLabel, publicCity, toNameFields } from "@/lib/locker-classify";
import { getLockerPersonById } from "@/lib/locker-directory";
import { athleteHref, parseAthleteTab } from "@/lib/locker-paths";
import { ATHLETE_TABS } from "@/lib/locker-types";

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getLockerPersonById(id);
  return {
    title: person ? displayName(toNameFields(person)) : "Profile",
  };
}

export default async function AthleteProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const person = await getLockerPersonById(id);
  if (!person) notFound();

  const tab = parseAthleteTab(firstParam(query.tab));
  const city = publicCity(person);

  return (
    <PageMain width="narrow">
      <Link href="/directory" className="text-sm font-medium text-navy hover:underline">
        ← Directory
      </Link>

      <Card>
        <CardContent className="flex gap-4 py-6">
          <HoyaAvatar person={person} size="lg" />
          <div className="min-w-0 space-y-2">
            <h1 className="font-heading text-3xl text-navy">{displayName(toNameFields(person))}</h1>
            <p className="text-sm text-muted-foreground">
              {[kindLabel(person.kind), person.classLabel, person.sport, city].filter(Boolean).join(" · ")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {person.position ? <Badge variant="secondary">{person.position}</Badge> : null}
              {person.sport ? <Badge variant="outline">{person.sport}</Badge> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <nav className="flex flex-wrap gap-2" aria-label="Profile sections">
        {ATHLETE_TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={athleteHref(person.id, item.id)}
              className={pillClass(active)}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {tab === "overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">About</p>
              <p className="mt-1">{person.about}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sport</p>
              <p className="mt-1">{[person.sport, person.position].filter(Boolean).join(" · ")}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
              <p className="mt-1">{city || "Not listed"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">LinkedIn</p>
              {person.linkedinUrl ? (
                <a href={person.linkedinUrl} target="_blank" rel="noreferrer" className="mt-1 block text-navy hover:underline">
                  {person.linkedinUrl.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              ) : (
                <p className="mt-1 text-muted-foreground">Not listed</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "stats" ? (
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {person.rosterYears.length === 0 ? (
              <p className="text-sm text-muted-foreground">Season stats shell — roster years will show here.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {person.rosterYears.map((row) => (
                  <li key={`${row.year}-${row.position}-${row.class}`}>
                    {row.year}
                    {row.position ? ` · ${row.position}` : ""}
                    {row.class ? ` · ${row.class}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "photos" ? (
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {person.photos.map((slot) => (
              <div key={slot.id} className="rounded-lg border bg-muted/40 px-3 py-8 text-center text-sm text-muted-foreground">
                {slot.url ? slot.caption : `${slot.caption} — empty`}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {tab === "career" ? (
        <Card>
          <CardHeader>
            <CardTitle>Career</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{jobLabel(person.companyName, person.jobTitle) || "Career shell — title and company will show here."}</p>
            {person.industry ? <p className="text-muted-foreground">{person.industry}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "qa" ? (
        <Card>
          <CardHeader>
            <CardTitle>Q&A</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {person.qa.map((item) => (
              <div key={item.id}>
                <p className="text-sm font-medium">{item.question}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.answer || "Answer shell"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </PageMain>
  );
}
