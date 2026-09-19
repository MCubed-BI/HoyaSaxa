import { NextResponse } from "next/server";
import { getBlastActor } from "@/lib/blast-auth";
import { coerceAlumniFilters, emptyFilters } from "@/lib/filters";
import { getAlumniIds } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await getBlastActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (actor.kind === "alum") {
      return NextResponse.json(
        { error: "Adding a filtered directory group is a staff blast tool." },
        { status: 403 },
      );
    }
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
