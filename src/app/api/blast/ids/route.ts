import { NextResponse } from "next/server";
import { coerceAlumniFilters, emptyFilters } from "@/lib/filters";
import { getAlumniIds } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      filters?: Record<string, unknown>;
      ids?: string[];
      includeFilters?: boolean;
      includeIds?: boolean;
    };
    const filters = coerceAlumniFilters(body.filters);
    const ids = await getAlumniIds({
      filters: body.includeFilters === false ? emptyFilters() : filters,
      ids: Array.isArray(body.ids) ? body.ids : [],
      includeFilters: body.includeFilters !== false,
      includeIds: Boolean(body.includeIds),
    });
    return NextResponse.json({ ids, count: ids.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve alumni";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
