import { NextResponse } from "next/server";
import {
  createCrmNote,
  deleteCrmNote,
  getCrmSnapshot,
  isCrmNoteKind,
} from "@/lib/crm";
import { ensureCrmTables } from "@/lib/crm-schema";
import { getAlumniById } from "@/lib/queries";
import { requireRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const viewer = await requireRole(["owner", "coach", "board"]);
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

  const kind = body.kind;
  if (!isCrmNoteKind(kind)) {
    return NextResponse.json({ error: "kind must be note or donation_call." }, { status: 400 });
  }

  try {
    await ensureCrmTables();
    const person = await getAlumniById(id);
    if (!person) {
      return NextResponse.json({ error: "Person not found." }, { status: 404 });
    }
    const note = await createCrmNote({
      alumniId: id,
      kind,
      body: typeof body.body === "string" ? body.body : undefined,
      calledAt: typeof body.calledAt === "string" ? body.calledAt : undefined,
      createdBy: viewer.label || "Staff",
    });
    const crm = await getCrmSnapshot(id);
    return NextResponse.json({ note, crm }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save note." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  await requireRole(["owner", "coach", "board"]);
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
  const noteId = typeof body.noteId === "string" ? body.noteId.trim() : "";
  if (!noteId) {
    return NextResponse.json({ error: "noteId is required." }, { status: 400 });
  }

  try {
    await ensureCrmTables();
    const ok = await deleteCrmNote(id, noteId);
    if (!ok) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }
    const crm = await getCrmSnapshot(id);
    return NextResponse.json({ crm });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete note." },
      { status: 400 },
    );
  }
}
