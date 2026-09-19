import { AlumniFilterChips } from "@/components/alumni-filter-chips";
import { AlumniFiltersForm } from "@/components/alumni-filters";
import { BlastComposer, type BlastChannel } from "@/components/blast-composer";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { ErrorState } from "@/components/query-state";
import { SiteHeader } from "@/components/site-header";
import { LoadedStamp } from "@/components/timestamp";
import { isMissingDatabaseConfig } from "@/lib/db";
import { parseAlumniFilters } from "@/lib/filters";
import { getAlumniFacets } from "@/lib/queries";
import { requireRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

function parseChannel(value: string | string[] | undefined): BlastChannel {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "email" ? "email" : "sms";
}

export default async function BlastPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["owner", "coach"]);
  const params = await searchParams;
  const filters = parseAlumniFilters(params);
  const channel = parseChannel(params.channel);

  try {
    const facets = await getAlumniFacets();
    return (
      <PageShell>
        <SiteHeader current="blast" />
        <PageMain>
          <PageHeader
            eyebrow="Outreach"
            title="Blast"
            description="One group — filters and/or checked alumni — then compose a text or an email in the app and send. Twilio and Gmail SMTP deliver when configured; otherwise the app prepares Messages, mailto, or copy."
          />
          <AlumniFilterChips filters={filters} action="/blast" extra={{ channel }} />
          <AlumniFiltersForm filters={filters} facets={facets} action="/blast" submitLabel="Update group" />
          <LoadedStamp value={new Date().toISOString()} />
          <BlastComposer filters={filters} initialChannel={channel} />
        </PageMain>
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell>
        <SiteHeader current="blast" />
        <PageMain>
          <ErrorState
            title="Blast unavailable"
            body={
              isMissingDatabaseConfig(error)
                ? "DATABASE_URL is not set. Add it to .env.local and reload."
                : error instanceof Error
                  ? error.message
                  : "Could not load this blast group."
            }
          />
        </PageMain>
      </PageShell>
    );
  }
}
