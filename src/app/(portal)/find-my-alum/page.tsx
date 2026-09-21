import { AlumniFiltersForm } from "@/components/alumni-filters";
import { FindMyAlumMapLoader } from "@/components/find-my-alum-map-loader";
import { AppHeader } from "@/components/app-header";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { parseAlumniFilters } from "@/lib/filters";
import { getAlumniMapPoints } from "@/lib/map-points";
import { getAlumniFacets } from "@/lib/queries";
import { canUseOwnerTools } from "@/lib/roles";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function FindMyAlumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireViewer();
  const filters = parseAlumniFilters(await searchParams);
  let errorMessage: string | null = null;
  let mapped: Awaited<ReturnType<typeof getAlumniMapPoints>> | null = null;
  let facets: Awaited<ReturnType<typeof getAlumniFacets>> | null = null;

  try {
    [mapped, facets] = await Promise.all([getAlumniMapPoints(filters), getAlumniFacets()]);
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load locations.";
  }

  const body = (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Find My Alum"
        description="Map and heat of alumni locations from current city/state, then hometown, then a parsed US address. Pins jitter slightly so people in the same city stay clickable."
      >
        {mapped ? (
          <p className="text-sm text-muted-foreground">
            {mapped.mappedCount} mapped
            {mapped.skippedCount ? ` · ${mapped.skippedCount} without a usable place` : ""}
            {mapped.totalAlumni ? ` · ${mapped.totalAlumni} in this filter` : ""}
          </p>
        ) : null}
      </PageHeader>
      {facets ? <AlumniFiltersForm filters={filters} facets={facets} action="/find-my-alum" /> : null}
      {errorMessage ? (
        <StatusCard title="Find My Alum unavailable" body={errorMessage} />
      ) : mapped ? (
        <FindMyAlumMapLoader
          points={mapped.points}
          profileBase={canUseOwnerTools(viewer.role) ? "/alumni" : "/directory"}
        />
      ) : null}
    </>
  );

  return (
    <PageShell>
      <AppHeader
        current="find-my-alum"
        role={viewer.role}
        viewerLabel={viewer.label}
        verifiedHoya={viewer.verifiedHoya}
      />
      <PageMain>{body}</PageMain>
    </PageShell>
  );
}
