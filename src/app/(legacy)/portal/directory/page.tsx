import { AlumDirectory } from "@/components/alum-directory";
import { AlumniFiltersForm } from "@/components/alumni-filters";
import { PortalShell } from "@/components/portal-shell";
import { PortalTabs } from "@/components/portal-tabs";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { hasActiveFilters, parseAlumniFilters, parsePage } from "@/lib/filters";
import { toPublicAlumniCard } from "@/lib/portal-queries";
import { searchAlumni } from "@/lib/queries";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function PortalDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const audience = String(Array.isArray(params.audience) ? params.audience[0] : params.audience ?? "all");
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
    <PortalShell viewer={viewer} current="portal-directory">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Hoya Directory</p>
        <h2 className="font-heading text-3xl text-white">Find a Hoya</h2>
        <p className="mt-1 max-w-2xl text-sm text-white/65">
          Search plus All / Athletes / Alumni / Coaches / Staff pills. Coder 1 owns photos and
          profile rows. Contact emails stay on the staff directory.
        </p>
      </div>
      <PortalTabs
        tabs={["all", "athletes", "alumni", "coaches", "staff"].map((item) => ({
          href: `/portal/directory?audience=${item}`,
          label: item[0]!.toUpperCase() + item.slice(1),
          active: audience === item,
        }))}
      />
      {audience === "coaches" || audience === "staff" ? (
        <StatusCard
          title="Coder 1 extension point"
          body="Coaches and staff lists are reserved. Alumni/athlete cards use the roster directory."
        />
      ) : result ? (
        <>
          <AlumniFiltersForm filters={filters} facets={result.facets} action="/portal/directory" submitLabel="Look up" />
          {result.total === 0 && !hasActiveFilters(filters) ? (
            <StatusCard
              title="No alumni loaded yet"
              body="Staff can sync roster data. Coder 1 can replace this list with profile cards."
            />
          ) : (
            <AlumDirectory
              rows={result.rows.map(toPublicAlumniCard)}
              total={result.total}
              page={result.page}
              pageSize={result.pageSize}
              filters={filters}
              basePath="/portal/directory"
              profileHref="/portal/profile"
            />
          )}
        </>
      ) : (
        <StatusCard title="Directory unavailable" body={errorMessage ?? "Unknown error"} />
      )}
    </PortalShell>
  );
}
