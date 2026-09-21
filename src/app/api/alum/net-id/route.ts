import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getAccountByAlumniId,
  resolveAlumniMeIdentity,
  updateAccountNetId,
} from "@/lib/alumni-claim";
import { getAthleteActor } from "@/lib/athlete-access";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getCurrentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const jar = await cookies();
    const viewer = await getCurrentViewer();
    const identity = await resolveAlumniMeIdentity(jar);
    if (!viewer && !identity.hasAlumSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { netId?: unknown; alumniId?: unknown };
    const raw = typeof body.netId === "string" ? body.netId : "";
    const alumniId = typeof body.alumniId === "string" ? body.alumniId.trim() : "";

    if (alumniId) {
      const actor = await getAthleteActor(alumniId);
      if (!actor.canEdit) {
        return NextResponse.json(
          { error: "Only the claimed alumnus or an admin can edit GTown NetID." },
          { status: 403 },
        );
      }
      const account = await getAccountByAlumniId(alumniId);
      if (!account) {
        return NextResponse.json({ error: "This roster row has no claimed alumni login yet." }, { status: 400 });
      }
      const updated = await updateAccountNetId(account.id, raw);
      return NextResponse.json({ ok: true, netId: updated.netId, account: updated });
    }

    const accountId = identity.accountId;
    if (!accountId) {
      return NextResponse.json(
        { error: "Sign in with your claimed alumni login to set a GTown NetID." },
        { status: 400 },
      );
    }
    const updated = await updateAccountNetId(accountId, raw);
    return NextResponse.json({ ok: true, netId: updated.netId, account: updated });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Could not save GTown NetID.";
    const status = message.includes("admin") || message.includes("claimed") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
