import { AlumniFiltersForm } from "@/components/alumni-filters";
import { BlastComposer, type BlastChannel } from "@/components/blast-composer";
import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
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
      <div className="flex min-h-full flex-col">
        <SiteHeader current="blast" />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Outreach</p>
            <h2 className="font-heading text-3xl text-navy">Blast</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              One group — filters and/or checked alumni — then compose a text or an email in the app and send.
              Twilio and Resend/SendGrid deliver when configured; otherwise the app prepares Messages, mailto, or copy.
            </p>
          </div>
          <AlumniFiltersForm filters={filters} facets={facets} action="/blast" submitLabel="Update group" />
          <BlastComposer filters={filters} initialChannel={channel} />
        </main>
      </div>
    );
  } catch (error) {
    return (
      <div className="flex min-h-full flex-col">
        <SiteHeader current="blast" />
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
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
        </main>
      </div>
    );
  }
}
