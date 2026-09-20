import { AlumniDirectory } from "@/components/alumni-directory";
import { AlumniFiltersForm } from "@/components/alumni-filters";
import { BlastBar } from "@/components/blast-bar";
import { FilterChip, FilterChipRow } from "@/components/filter-toolbar";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SiteHeader } from "@/components/site-header";
import { listPublicBadgesManyFromFeed } from "@/lib/badges-attendance";
import { alumniFilterChips, hasActiveFilters, parseAlumniFilters, parsePage } from "@/lib/filters";
import { isMissingDatabaseConfig } from "@/lib/db";
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
  const chips = alumniFilterChips(filters);

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

  const badgesById = result ? await listPublicBadgesManyFromFeed(result.rows.map((row) => row.id)) : {};

  return (
    <PageShell>
      <SiteHeader current="directory" />
      <PageMain>
        <PageHeader
          eyebrow="Staff directory"
          title="Alumni"
          description="Multi-select filters, then check alumni to build a blast list for text or email. Open a player card for the full contact record."
        />

        {result ? (
          <>
            <div className="sticky top-20 z-20 space-y-3">
              {chips.length > 0 ? (
                <FilterChipRow clearHref="/">
                  {chips.map((chip) => (
                    <FilterChip key={chip.id} href={chip.href}>
                      {chip.label}
                    </FilterChip>
                  ))}
                </FilterChipRow>
              ) : null}
              <AlumniFiltersForm filters={filters} facets={result.facets} />
            </div>
            {result.total === 0 && !hasActiveFilters(filters) ? (
              <EmptyState
                title="No alumni loaded yet"
                body="The directory is empty. Set DATABASE_URL and run npm run import -- --file path/to/georgetown-alumni.xlsx."
                icon="directory"
              />
            ) : (
              <>
                <AlumniDirectory
                  rows={result.rows}
                  total={result.total}
                  page={result.page}
                  pageSize={result.pageSize}
                  filters={filters}
                  badgesById={badgesById}
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
          <ErrorState title="Directory unavailable" body={errorMessage ?? "Unknown error"} />
        )}
      </PageMain>
    </PageShell>
  );
}
