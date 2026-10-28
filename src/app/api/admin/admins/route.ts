import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import {
  isAlumniRecordId,
  listAdminMembers,
  setAdminMember,
} from "@/lib/staff-roles";
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

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    return NextResponse.json({ members: await listAdminMembers() });
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
    admin?: boolean;
    name?: string;
    email?: string;
    username?: string;
  };
  const alumniId = body.alumniId?.trim() ?? "";
  if (!isAlumniRecordId(alumniId)) {
    return NextResponse.json({ error: "alumniId must be a roster UUID" }, { status: 400 });
  }
  try {
    const result = await setAdminMember({
      alumniId,
      grant: Boolean(body.admin),
      name: body.name,
      email: body.email,
      username: body.username,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Could not update Admin";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
