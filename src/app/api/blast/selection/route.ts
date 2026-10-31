import { NextResponse } from "next/server";
import { getBlastActor } from "@/lib/blast-auth";
import { isMissingDatabaseConfig } from "@/lib/db";
import { resolveSelectedAlumniIds } from "@/lib/selection-resolve";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await getBlastActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
    const ids = await resolveSelectedAlumniIds(body.ids);
    return NextResponse.json({ ids, count: ids.length });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Unable to resolve selection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
