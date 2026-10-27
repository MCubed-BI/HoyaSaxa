import { NextResponse } from "next/server";
import { getCrmSnapshot } from "@/lib/crm";
import { ensureCrmTables } from "@/lib/crm-schema";
import { getAlumniById } from "@/lib/queries";
import { requireRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  await requireRole(["owner", "coach", "board"]);
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing person id." }, { status: 400 });
  }

  try {
    await ensureCrmTables();
    const person = await getAlumniById(id);
    if (!person) {
      return NextResponse.json({ error: "Person not found." }, { status: 404 });
    }
    const crm = await getCrmSnapshot(id);
    return NextResponse.json({ crm });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load CRM." },
      { status: 500 },
    );
  }
}
