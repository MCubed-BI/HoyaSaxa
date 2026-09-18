import { NextResponse } from "next/server";
import { csvEscape } from "@/lib/format";
import { parseAlumniFilters, searchParamsToRecord } from "@/lib/filters";
import { getContactExportRows } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = parseAlumniFilters(searchParamsToRecord(searchParams));

  try {
    const rows = await getContactExportRows(filters);
    const header = [
      "Name",
      "Position",
      "Class year",
      "City",
      "State",
      "Company",
      "Title",
      "Emails",
      "Phones",
      "LinkedIn",
    ];
    const lines = [
      header.join(","),
      ...rows.map((row) =>
        [
          csvEscape(row.name ?? ""),
          csvEscape(row.position ?? ""),
          csvEscape(row.class_year ?? ""),
          csvEscape(row.current_city ?? ""),
          csvEscape(row.current_state ?? ""),
          csvEscape(row.company_name ?? ""),
          csvEscape(row.job_title ?? ""),
          csvEscape((row.emails ?? []).join("; ")),
          csvEscape((row.phones ?? []).join("; ")),
          csvEscape(row.linkedin_url ?? ""),
        ].join(","),
      ),
    ];

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="georgetown-alum-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
