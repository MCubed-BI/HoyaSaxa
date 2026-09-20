import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { canPostToFeedSection } from "@/lib/feed-sections";
import { createNewsflashPost } from "@/lib/locker-queries";
import { getLockerViewer } from "@/lib/locker-viewer";

export async function POST(request: Request) {
  const viewer = await getLockerViewer();
  if (!viewer) {
    return NextResponse.redirect(new URL("/home/login", request.url), { status: 303 });
  }
  if (!viewer.canPostNewsflash || !canPostToFeedSection(viewer.platformRole, "board")) {
    return NextResponse.redirect(new URL("/board", request.url), { status: 303 });
  }

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const eventDate = String(form.get("event_at") ?? "").trim();
  if (!title || !body) {
    return NextResponse.redirect(new URL("/board", request.url), { status: 303 });
  }

  try {
    await createNewsflashPost({
      title,
      body,
      eventAt: eventDate ? `${eventDate}T12:00:00.000Z` : null,
      authorLabel: viewer.label,
    });
    return NextResponse.redirect(new URL("/board", request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.redirect(new URL("/board", request.url), { status: 303 });
    }
    throw error;
  }
}
