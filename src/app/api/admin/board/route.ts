import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { isAlumniRecordId, isBoardMember, listBoardMembers, setBoardMember } from "@/lib/staff-roles";
import { getCurrentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const viewer = await getCurrentViewer();
  if (!viewer) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (viewer.platformRole !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { viewer };
}

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const url = new URL(request.url);
  const alumniId = url.searchParams.get("alumniId")?.trim() ?? "";
  try {
    if (alumniId) {
      if (!isAlumniRecordId(alumniId)) {
        return NextResponse.json({ error: "alumniId must be a roster UUID" }, { status: 400 });
      }
      return NextResponse.json({ alumniId, board: await isBoardMember(alumniId) });
    }
    return NextResponse.json({ members: await listBoardMembers() });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = (await request.json().catch(() => ({}))) as {
    alumniId?: string;
    board?: boolean;
    name?: string;
    email?: string;
  };
  const alumniId = body.alumniId?.trim() ?? "";
  if (!isAlumniRecordId(alumniId)) {
    return NextResponse.json({ error: "alumniId must be a roster UUID" }, { status: 400 });
  }
  try {
    const result = await setBoardMember({
      alumniId,
      grant: Boolean(body.board),
      name: body.name,
      email: body.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Could not update Board member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
