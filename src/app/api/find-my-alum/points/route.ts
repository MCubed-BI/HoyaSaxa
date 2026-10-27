import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { parseAlumniFilters } from "@/lib/filters";
import { getAlumniMapPoints } from "@/lib/map-points";
import { getCurrentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/** Map pins for Find My Alum — kept off the document request so the page shell stays fast. */
export async function GET(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in to view the map." }, { status: 401 });
  }
  const url = new URL(request.url);
  const searchParams: Record<string, string | string[] | undefined> = {};
  for (const key of url.searchParams.keys()) {
    const all = url.searchParams.getAll(key);
    searchParams[key] = all.length <= 1 ? all[0] : all;
  }
  const filters = parseAlumniFilters(searchParams);

  try {
    const mapped = await getAlumniMapPoints(filters);
    return NextResponse.json(mapped, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set."
      : error instanceof Error
        ? error.message
        : "Could not load locations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
