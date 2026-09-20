import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { canPostSgarlataOrCoachBoard } from "@/lib/platform-roles";
import { createCoachMessage } from "@/lib/portal-queries";
import { safeNextPath } from "@/lib/safe-next";
import { getCurrentViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canPostSgarlataOrCoachBoard(viewer.platformRole)) {
    return NextResponse.redirect(new URL("/message", request.url), { status: 303 });
  }

  const form = await request.formData();
  const next = safeNextPath(form.get("next"), "/message");
  const title = String(form.get("title") ?? "");
  const body = String(form.get("body") ?? "").trim();
  if (!body) {
    return NextResponse.redirect(new URL(next, request.url), { status: 303 });
  }

  try {
    await createCoachMessage({
      title,
      body,
      authorRole: viewer.role,
      authorLabel: viewer.label,
    });
    return NextResponse.redirect(new URL(next, request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.redirect(new URL(next, request.url), { status: 303 });
    }
    throw error;
  }
}
