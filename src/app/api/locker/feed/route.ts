import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { createLockerFeedPost } from "@/lib/locker-queries";
import { getLockerViewer } from "@/lib/locker-viewer";

export async function POST(request: Request) {
  const viewer = await getLockerViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!viewer.canPostBrothers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!body) {
    return NextResponse.redirect(new URL("/feed", request.url), { status: 303 });
  }

  try {
    await createLockerFeedPost({
      authorLabel: viewer.label,
      authorRole: viewer.mode === "admin" ? "official" : "alum",
      audience: "brothers",
      title,
      body,
    });
    return NextResponse.redirect(new URL("/feed", request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.redirect(new URL("/feed", request.url), { status: 303 });
    }
    throw error;
  }
}
