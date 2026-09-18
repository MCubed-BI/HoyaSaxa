import Link from "next/link";
import { AlumDirectory } from "@/components/alum-directory";
import { AlumniFiltersForm } from "@/components/alumni-filters";
import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
import { Card, CardContent } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { hasActiveFilters, parseAlumniFilters, parsePage } from "@/lib/filters";
import { toPublicAlumniCard } from "@/lib/portal-queries";
import { searchAlumni } from "@/lib/queries";
import { requireViewer, viewerSubtitle } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function AlumHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const filters = parseAlumniFilters(params);
  const page = parsePage(params);

  let result: Awaited<ReturnType<typeof searchAlumni>> | null = null;
  let errorMessage: string | null = null;

  try {
    result = await searchAlumni(filters, page);
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local, then restart the app."
      : error instanceof Error
        ? error.message
        : "The directory could not be loaded.";
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="alum" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {viewerSubtitle(viewer)}
          </p>
          <h2 className="font-heading text-3xl text-navy">Alumni portal</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Look up classmates on read-only cards. Contact emails and phones stay on the coach
            directory. Claimed sessions from Register/Claim attach to your alumni id when present.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <PortalLink href="/message" title="Message from Coach" body="Notes from Coach Sgarlata." />
          <PortalLink href="/newsflash" title="Newsflash" body="Board news and upcoming events." />
          <PortalLink href="/fundraising" title="Fundraising" body="Campaigns and pledge intents." />
        </div>
        <PortalLink href="/find-my-alum" title="Find My Alum" body="Location groups now; map slot if a map lands later." />

        {result ? (
          <>
            <AlumniFiltersForm filters={filters} facets={result.facets} action="/alum" submitLabel="Look up" />
            {result.total === 0 && !hasActiveFilters(filters) ? (
              <StatusCard
                title="No alumni loaded yet"
                body="The directory is empty. Staff can sync or import roster data, then alumni can look each other up here."
              />
            ) : (
              <AlumDirectory
                rows={result.rows.map(toPublicAlumniCard)}
                total={result.total}
                page={result.page}
                pageSize={result.pageSize}
                filters={filters}
              />
            )}
          </>
        ) : (
          <StatusCard title="Directory unavailable" body={errorMessage ?? "Unknown error"} />
        )}
      </main>
    </div>
  );
}

function PortalLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardContent className="py-4">
          <p className="font-medium text-navy">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
