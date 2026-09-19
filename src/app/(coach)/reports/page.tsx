import { SiteHeader } from "@/components/site-header";
import { AlumniFilterChips } from "@/components/alumni-filter-chips";
import { AlumniFiltersForm } from "@/components/alumni-filters";
import { CopyContacts } from "@/components/copy-contacts";
import { DataTable, StickyTableHeader, Table, TableBody, TableHead, TableRow } from "@/components/data-table";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { EmptyState, ErrorState } from "@/components/query-state";
import { LoadedStamp } from "@/components/timestamp";
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { filtersToSearchParams, hasActiveFilters, parseAlumniFilters } from "@/lib/filters";
import { getAlumniFacets, getContactExportRows, getReportSummary } from "@/lib/queries";
import { Kpi, KpiGrid } from "@/components/kpi";
import { classYearLabel, displayName, formatNumber, positionLabel } from "@/lib/format";
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

          <AlumniFilterChips filters={filters} action="/reports" />
          <AlumniFiltersForm
            filters={filters}
            facets={facets}
            action="/reports"
            submitLabel="Build group"
          />
          <LoadedStamp value={new Date().toISOString()} />

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
                <EmptyState
                  title={hasActiveFilters(filters) ? "No alumni match this group" : "The database is empty"}
                  body={
                    hasActiveFilters(filters)
                      ? "Widen the filters to build a report group."
                      : "Run the import script, then build a group here."
                  }
                  icon="reports"
                />
              ) : (
                <CopyContacts query={query} />
              )}
            </CardContent>
          </Card>

          {previewRows.length > 0 ? (
            <DataTable caption="Preview">
              <Table container={false}>
                <StickyTableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position / class</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </StickyTableHeader>
                <TableBody>
                  {previewRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-navy">
                        {row.name ||
                          displayName({
                            preferred_name: null,
                            first_name: null,
                            last_name: row.name,
                            full_name: row.name,
                          })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[positionLabel(row.position), classYearLabel(row.class_year), row.company_name]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatNumber(row.emails.length)} email{row.emails.length === 1 ? "" : "s"} ·{" "}
                        {formatNumber(row.phones.length)} phone{row.phones.length === 1 ? "" : "s"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {count > previewRows.length ? (
                <p className="border-t px-4 py-2 text-sm text-muted-foreground">
                  Showing {formatNumber(previewRows.length)} of {formatNumber(count)}. Download the CSV for the full list.
                </p>
              ) : null}
            </DataTable>
          ) : null}
        </PageMain>
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell>
        <SiteHeader current="reports" />
        <PageMain>
          <ErrorState
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
