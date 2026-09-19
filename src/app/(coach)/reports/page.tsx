import { SiteHeader } from "@/components/site-header";
import { AlumniFiltersForm } from "@/components/alumni-filters";
import { CopyContacts } from "@/components/copy-contacts";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { filtersToSearchParams, hasActiveFilters, parseAlumniFilters } from "@/lib/filters";
import { getAlumniFacets, getContactExportRows, getReportSummary } from "@/lib/queries";
import { Kpi, KpiGrid } from "@/components/kpi";
import { displayName, formatNumber } from "@/lib/format";
import { requireRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["owner", "coach"]);
  const params = await searchParams;
  const filters = parseAlumniFilters(params);
  const query = filtersToSearchParams(filters).toString();

  try {
    const [facets, summary] = await Promise.all([getAlumniFacets(), getReportSummary(filters)]);
    const count = summary.alumni;
    const previewRows = count > 0 ? await getContactExportRows(filters, 12) : [];
    const emailCount = summary.emails;
    const phoneCount = summary.phones;

    return (
      <PageShell>
        <SiteHeader current="reports" />
        <PageMain>
          <PageHeader
            eyebrow="Outreach"
            title="Reports"
            description="Multi-select a group, then download a CSV or continue to an in-app text or email blast."
          />

          <AlumniFiltersForm
            filters={filters}
            facets={facets}
            action="/reports"
            submitLabel="Build group"
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Group</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <KpiGrid>
                <Kpi tone="primary" icon="directory" label="Alumni" value={formatNumber(count)} />
                <Kpi tone="secondary" icon="messages" label="With email" value={formatNumber(emailCount)} />
                <Kpi
                  tone={phoneCount === 0 && count > 0 ? "alert" : "secondary"}
                  icon="blast"
                  label="With phone"
                  value={formatNumber(phoneCount)}
                />
              </KpiGrid>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href={`/blast${query ? `?${query}` : ""}`}>Text this group</a>
                </Button>
                <Button asChild variant="outline">
                  <a href={`/blast?${query ? `${query}&` : ""}channel=email`}>Email this group</a>
                </Button>
              </div>
              {count === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters(filters)
                    ? "No alumni match this group. Widen the filters."
                    : "The database is empty. Run the import script, then build a group here."}
                </p>
              ) : (
                <CopyContacts query={query} />
              )}
            </CardContent>
          </Card>

          {previewRows.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {previewRows.map((row) => (
                  <div key={row.id} className="flex items-baseline justify-between gap-3 border-b py-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-navy">{row.name || displayName({
                        preferred_name: null,
                        first_name: null,
                        last_name: row.name,
                        full_name: row.name,
                      })}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {[row.position, row.class_year, row.company_name].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {row.emails.length} email{row.emails.length === 1 ? "" : "s"} · {row.phones.length} phone
                      {row.phones.length === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
                {count > previewRows.length ? (
                  <p className="pt-1 text-sm text-muted-foreground">
                    Showing {previewRows.length} of {formatNumber(count)}. Download the CSV for the full list.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </PageMain>
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell>
        <SiteHeader current="reports" />
        <PageMain>
          <StatusCard
            title="Reports unavailable"
            body={
              isMissingDatabaseConfig(error)
                ? "DATABASE_URL is not set. Add it to .env.local and reload."
                : error instanceof Error
                  ? error.message
                  : "Could not load this group."
            }
          />
        </PageMain>
      </PageShell>
    );
  }
}
