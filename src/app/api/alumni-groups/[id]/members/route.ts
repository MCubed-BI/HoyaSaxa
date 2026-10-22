import { NextResponse } from "next/server";
import { addAlumniGroupMembers, removeAlumniGroupMembers } from "@/lib/alumni-groups";
import { getBlastActor, normalizeBlastIds } from "@/lib/blast-auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await getBlastActor();
    if (!actor || actor.kind !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const body = (await request.json()) as { memberIds?: string[] };
    const result = await addAlumniGroupMembers(id, normalizeBlastIds(body.memberIds));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add members";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await getBlastActor();
    if (!actor || actor.kind !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { memberIds?: string[] };
    const result = await removeAlumniGroupMembers(id, normalizeBlastIds(body.memberIds));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove members";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
