import { NextResponse } from "next/server";
import { parseAlumniFilters, searchParamsToRecord } from "@/lib/filters";
import { getContactExportRows } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = parseAlumniFilters(searchParamsToRecord(searchParams));

  try {
    const rows = await getContactExportRows(filters);
    const emails = [...new Set(rows.flatMap((row) => row.emails ?? []).filter(Boolean))];
    const phones = [...new Set(rows.flatMap((row) => row.phones ?? []).filter(Boolean))];
    return NextResponse.json({
      count: rows.length,
      emails,
      phones,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
