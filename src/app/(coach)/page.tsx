import { AlumniDirectory } from "@/components/alumni-directory";
import { AlumniFiltersForm } from "@/components/alumni-filters";
import { BlastBar } from "@/components/blast-bar";
import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { hasActiveFilters, parseAlumniFilters, parsePage } from "@/lib/filters";
import { searchAlumni } from "@/lib/queries";
import { canUseBlast } from "@/lib/roles";
import { requireRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireRole(["owner", "coach", "board"]);
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
      <SiteHeader current="directory" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Staff directory
          </p>
          <h2 className="font-heading text-3xl text-navy">Alumni</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Multi-select filters, then check alumni to build a blast list for text or email. Open a
            player card for the full contact record.
          </p>
        </div>

        {result ? (
          <>
            <AlumniFiltersForm filters={filters} facets={result.facets} />
            {result.total === 0 && !hasActiveFilters(filters) ? (
              <StatusCard
                title="No alumni loaded yet"
                body="The directory is empty. Set DATABASE_URL and run npm run import -- --file path/to/georgetown-alumni.xlsx."
              />
            ) : (
              <>
                <AlumniDirectory
                  rows={result.rows}
                  total={result.total}
                  page={result.page}
                  pageSize={result.pageSize}
                  filters={filters}
                />
                {canUseBlast(viewer.role) ? (
                  <BlastBar
                    filters={filters}
                    pageIds={result.rows.map((row) => row.id)}
                    totalMatching={result.total}
                  />
                ) : null}
              </>
            )}
          </>
        ) : (
          <StatusCard title="Directory unavailable" body={errorMessage ?? "Unknown error"} />
        )}
      </main>
    </div>
  );
}
