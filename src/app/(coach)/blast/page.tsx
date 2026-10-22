import { AlumniFiltersForm } from "@/components/alumni-filters";
import { BlastComposer, type BlastChannel } from "@/components/blast-composer";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
import { listAlumniGroups } from "@/lib/alumni-groups";
import { isMissingDatabaseConfig } from "@/lib/db";
import { parseAlumniFilters } from "@/lib/filters";
import { getAlumniFacets } from "@/lib/queries";
import { requireRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

function parseChannel(value: string | string[] | undefined): BlastChannel {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "email" ? "email" : "sms";
}

function parseGroupId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || "";
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
  const initialGroupId = parseGroupId(params.group);

  try {
    const [facets, groups] = await Promise.all([getAlumniFacets(), listAlumniGroups()]);
    return (
      <PageShell>
        <SiteHeader current="blast" />
        <PageMain>
          <PageHeader
            eyebrow="Outreach"
            title="Blast"
            description="Build recipients from filters, directory picks, and/or a saved group — then compose a text or email. Twilio and Gmail SMTP deliver when configured; otherwise the app prepares Messages, mailto, or copy."
          />
          <AlumniFiltersForm filters={filters} facets={facets} action="/blast" submitLabel="Update group" />
          <BlastComposer
            filters={filters}
            initialChannel={channel}
            initialGroups={groups}
            initialGroupId={initialGroupId}
          />
        </PageMain>
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell>
        <SiteHeader current="blast" />
        <PageMain>
          <StatusCard
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
