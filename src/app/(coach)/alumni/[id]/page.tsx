import Link from "next/link";
import { notFound } from "next/navigation";
import { HoyaBadgeRow } from "@/components/hoya-badges";
import { PageMain, PageShell } from "@/components/page-chrome";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPublicBadgesFromFeed } from "@/lib/badges-attendance";
import { isMissingDatabaseConfig } from "@/lib/db";
import {
  classYearLabel,
  displayName,
  displayPersonName,
  formatPhone,
  initials,
  jobLabel,
  locationLabel,
  positionLabel,
} from "@/lib/format";
import { getAlumniById } from "@/lib/queries";
import { requireRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}

export default async function AlumniDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["owner", "coach", "board"]);
  const { id } = await params;

  try {
    const person = await getAlumniById(id);
    if (!person) notFound();
    const badges = await listPublicBadgesFromFeed(person.id);

    const emails = [
      ...(person.email_primary ? [{ email: person.email_primary, label: "Primary" }] : []),
      ...person.emails
        .filter((item) => item.email.toLowerCase() !== person.email_primary?.toLowerCase())
        .map((item) => ({ email: item.email, label: item.label || "Email" })),
    ];
    const phones = [
      ...(person.phone_primary ? [{ phone: person.phone_primary, label: "Primary" }] : []),
      ...person.phones
        .filter((item) => item.phone !== person.phone_primary)
        .map((item) => ({ phone: item.phone, label: item.label || "Phone" })),
    ];

    return (
      <PageShell>
        <SiteHeader current="directory" />
        <PageMain width="record">
          <Link href="/" className="text-sm font-medium text-navy hover:underline">
            ← Back to directory
          </Link>

          <Card>
            <CardContent className="flex flex-col gap-5 py-6 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy text-lg font-semibold text-white">
                {initials(person)}
              </div>
              <div className="min-w-0 space-y-2">
                <div>
                  <h2 className="font-heading text-3xl text-navy">{displayName(person)}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[positionLabel(person.position), classYearLabel(person.class_year), person.seasons]
                      .filter(Boolean)
                      .join(" · ") || "Georgetown football"}
                  </p>
                </div>
                {person.headline ? <p className="max-w-2xl text-sm">{person.headline}</p> : null}
                <div className="flex flex-wrap gap-1.5">
                  {positionLabel(person.position) ? (
                    <Badge variant="secondary">{positionLabel(person.position)}</Badge>
                  ) : null}
                  {classYearLabel(person.class_year) ? (
                    <Badge variant="secondary">{classYearLabel(person.class_year)}</Badge>
                  ) : null}
                  {person.industry ? <Badge variant="outline">{person.industry}</Badge> : null}
                </div>
                <HoyaBadgeRow badges={badges} />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Player</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Preferred name" value={displayPersonName(person.preferred_name)} />
                <Field label="Full name" value={displayPersonName(person.full_name)} />
                <Field label="Position" value={positionLabel(person.position)} />
                <Field label="Seasons" value={person.seasons} />
                <Field label="Class year" value={classYearLabel(person.class_year)} />
                <Field
                  label="Hometown"
                  value={locationLabel(person.hometown_city, person.hometown_state)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Now</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field
                  label="Current location"
                  value={locationLabel(person.current_city, person.current_state)}
                />
                <Field label="Company" value={person.company_name} />
                <Field label="Title" value={person.job_title} />
                <Field label="Industry" value={person.industry} />
                <Field label="Work" value={jobLabel(person.company_name, person.job_title)} />
                {person.linkedin_url ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">LinkedIn</p>
                    <a
                      href={person.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block truncate text-sm text-navy hover:underline"
                    >
                      {person.linkedin_url.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </div>
                ) : (
                  <Field label="LinkedIn" value="Not on file" />
                )}
                <Field label="Address" value={person.address_primary} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {emails.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No email on file.</p>
                ) : (
                  emails.map((item) => (
                    <div key={item.email}>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                      <a href={`mailto:${item.email}`} className="text-sm text-navy hover:underline">
                        {item.email}
                      </a>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Phones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {phones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No phone on file.</p>
                ) : (
                  phones.map((item) => (
                    <div key={item.phone}>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                      <a href={`tel:${item.phone}`} className="text-sm text-navy hover:underline">
                        {formatPhone(item.phone)}
                      </a>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Roster years</CardTitle>
            </CardHeader>
            <CardContent>
              {person.roster_years.length === 0 ? (
                <p className="text-sm text-muted-foreground">No season-by-season roster rows yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {person.roster_years.map((row) => (
                    <Badge key={row.id} variant="secondary" className="font-normal">
                      {row.year}
                      {positionLabel(row.position) ? ` · ${positionLabel(row.position)}` : ""}
                      {row.class ? ` · ${row.class}` : ""}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </PageMain>
      </PageShell>
    );
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return (
        <PageShell>
          <SiteHeader current="directory" />
          <PageMain width="record" className="text-center">
            <h2 className="font-heading text-2xl text-navy">Database is not configured</h2>
            <p className="mt-2 text-sm text-muted-foreground">Set DATABASE_URL and reload.</p>
          </PageMain>
        </PageShell>
      );
    }
    throw error;
  }
}
