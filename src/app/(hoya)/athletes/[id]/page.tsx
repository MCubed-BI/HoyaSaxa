import Link from "next/link";
import { notFound } from "next/navigation";
import { AthleteEmailField } from "@/components/athlete-emails";
import { AthleteMergePanel } from "@/components/athlete-merge-panel";
import { AthletePhotoEditor, AthletePhotoPair } from "@/components/athlete-photos";
import { HoyaAvatar } from "@/components/hoya-avatar";
import { LinkedInProfileField } from "@/components/linkedin-profile-link";
import { PageMain, pillClass } from "@/components/page-chrome";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isPreviewAlumSession, readAlumSessionFromCookies } from "@/lib/alum-session";
import { findLikelyDuplicateCandidates } from "@/lib/alumni-claim";
import { getAthleteActor } from "@/lib/athlete-access";
import { athletePhotoSlots } from "@/lib/athlete-photo-slots";
import { HoyaBadgeRow } from "@/lib/badge-api";
import { listPublicBadgesManyFromFeed } from "@/lib/badges-attendance";
import { displayName, jobLabel, positionLabel } from "@/lib/format";
import { kindLabel, publicCity, toNameFields } from "@/lib/locker-classify";
import { getLockerPersonById } from "@/lib/locker-directory";
import { athleteHref, parseAthleteTab } from "@/lib/locker-paths";
import { ATHLETE_TABS } from "@/lib/locker-types";
import { requireLockerViewer } from "@/lib/locker-viewer";

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
  await requireLockerViewer("/login");
  const { id } = await params;
  const query = await searchParams;
  const person = await getLockerPersonById(id);
  if (!person) notFound();

  const tab = parseAthleteTab(firstParam(query.tab));
  const city = publicCity(person);
  const name = displayName(toNameFields(person));
  const photos = athletePhotoSlots(person);
  const actor = await getAthleteActor(person.id);
  const session = await readAlumSessionFromCookies();
  const viewingOwnClaim =
    session && !isPreviewAlumSession(session) && session.alumniId === person.id ? [person.id] : [];
  const badgesById = await listPublicBadgesManyFromFeed([person.id], { verifiedAlumniIds: viewingOwnClaim });
  const badges = badgesById[person.id] ?? [];
  const duplicates =
    actor.canMerge && !person.id.startsWith("locker-")
      ? await findLikelyDuplicateCandidates(
          {
            id: person.id,
            first_name: person.firstName,
            last_name: person.lastName,
            preferred_name: person.preferredName,
            full_name: person.fullName,
          },
          actor.accountId,
        )
      : [];
  const visibleDuplicates = actor.isAdmin
    ? duplicates
    : duplicates.filter((row) => !row.claimed || row.claimed_by_me);

  return (
    <PageMain width="narrow">
      <Link href="/directory" className="text-sm font-medium text-navy hover:underline">
        ← Directory
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-5 py-6 sm:flex-row sm:items-start">
          <div className="w-full max-w-xs shrink-0 sm:max-w-[14rem]">
            <AthletePhotoPair slots={photos} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start gap-3">
              <HoyaAvatar person={person} size="lg" />
              <div className="min-w-0">
                <h1 className="font-heading text-3xl text-navy">{name}</h1>
                <p className="text-sm text-muted-foreground">
                  {[kindLabel(person.kind), person.classLabel, person.sport, city].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {positionLabel(person.position) ? (
                <Badge variant="secondary">{positionLabel(person.position)}</Badge>
              ) : null}
              {person.sport ? <Badge variant="outline">{person.sport}</Badge> : null}
            </div>
            <HoyaBadgeRow badges={badges} />
            <AthleteEmailField emails={person.emails} showEmpty={false} />
            <LinkedInProfileField url={person.linkedinUrl} showEmpty={false} />
            {actor.canEdit ? (
              <div className="pt-2">
                <AthletePhotoEditor alumniId={person.id} slots={photos} />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {actor.canMerge ? (
        <AthleteMergePanel keeperId={person.id} keeperName={name} candidates={visibleDuplicates} />
      ) : null}

      <nav className="flex flex-wrap gap-2" aria-label="Profile sections">
        {ATHLETE_TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link key={item.id} href={athleteHref(person.id, item.id)} className={pillClass(active)}>
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
              <p className="mt-1">{[person.sport, positionLabel(person.position)].filter(Boolean).join(" · ")}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
              <p className="mt-1">{city || "Not listed"}</p>
            </div>
            <AthleteEmailField emails={person.emails} />
            <LinkedInProfileField url={person.linkedinUrl} />
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
                    {positionLabel(row.position) ? ` · ${positionLabel(row.position)}` : ""}
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
          <CardContent className="space-y-4">
            <AthletePhotoPair slots={photos} size="lg" />
            {actor.canEdit ? <AthletePhotoEditor alumniId={person.id} slots={photos} /> : null}
            {!actor.canEdit ? (
              <p className="text-sm text-muted-foreground">
                Roster and current photos can be edited by this player after a claim login, or by staff admin.
              </p>
            ) : null}
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
            <AthleteEmailField emails={person.emails} />
            <LinkedInProfileField url={person.linkedinUrl} />
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
