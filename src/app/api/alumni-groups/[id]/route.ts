import { NextResponse } from "next/server";
import {
  deleteAlumniGroup,
  getAlumniGroup,
  listAlumniGroupMembers,
  renameAlumniGroup,
} from "@/lib/alumni-groups";
import { getBlastActor } from "@/lib/blast-auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const actor = await getBlastActor();
    if (!actor || actor.kind !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const group = await getAlumniGroup(id);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    const members = await listAlumniGroupMembers(id);
    return NextResponse.json({ group, members });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await getBlastActor();
    if (!actor || actor.kind !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const body = (await request.json()) as { name?: string };
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const group = await renameAlumniGroup(id, body.name);
    return NextResponse.json({ group });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update group";
    const status = message.includes("not found")
      ? 404
      : message.includes("required") || message.includes("too long")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const actor = await getBlastActor();
    if (!actor || actor.kind !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const ok = await deleteAlumniGroup(id);
    if (!ok) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
