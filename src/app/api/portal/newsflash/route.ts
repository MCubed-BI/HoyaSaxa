import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { canPostToFeedSection } from "@/lib/feed-sections";
import { createNewsflashPost } from "@/lib/portal-queries";
import { safeNextPath } from "@/lib/safe-next";
import { getCurrentViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canPostToFeedSection(viewer.platformRole, "board")) {
    return NextResponse.redirect(new URL("/board", request.url), { status: 303 });
  }

  const form = await request.formData();
  const next = safeNextPath(form.get("next"), "/board");
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const eventDate = String(form.get("event_at") ?? "").trim();
  if (!title || !body) {
    return NextResponse.redirect(new URL(next, request.url), { status: 303 });
  }

  try {
    await createNewsflashPost({
      title,
      body,
      eventAt: eventDate ? `${eventDate}T12:00:00.000Z` : null,
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
