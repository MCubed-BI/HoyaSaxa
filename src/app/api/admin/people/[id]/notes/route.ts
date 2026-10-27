import { NextResponse } from "next/server";
import {
  createContactNote,
  isContactNoteKind,
  listContactNotes,
  normalizeContactNoteKind,
} from "@/lib/crm";
import { isMissingDatabaseConfig } from "@/lib/db";
import { requirePlatformRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  await requirePlatformRole(["admin"]);
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing person id." }, { status: 400 });
  }

  const url = new URL(request.url);
  const kindParam = url.searchParams.get("kind");
  const kind = kindParam && isContactNoteKind(kindParam) ? kindParam : undefined;

  try {
    const notes = await listContactNotes(id, { kind });
    return NextResponse.json({ notes });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
    }
    throw error;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const viewer = await requirePlatformRole(["admin"]);
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing person id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const noteBody = typeof body.body === "string" ? body.body : "";
  if (!noteBody.trim()) {
    return NextResponse.json({ error: "Note body is required." }, { status: 400 });
  }
  if (body.kind != null && !isContactNoteKind(body.kind)) {
    return NextResponse.json(
      { error: "kind must be donation_call or note." },
      { status: 400 },
    );
  }

  try {
    const note = await createContactNote({
      alumniId: id,
      kind: normalizeContactNoteKind(body.kind),
      body: noteBody,
      createdBy: viewer.label || viewer.username || "Admin",
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
    }
    if (error instanceof Error && error.message === "Note body is required.") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
