import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { canCreateEvents, getEventActorFromToken, isEventCategory } from "@/lib/event-auth";
import { parseEventDateTime } from "@/lib/event-datetime";
import { createEvent } from "@/lib/event-queries";

function formString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/events";
  return value;
}

function redirectWithError(request: Request, path: string, error: string) {
  const url = new URL(path, request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const jar = await cookies();
  const actor = getEventActorFromToken(jar.get(SESSION_COOKIE)?.value);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canCreateEvents(actor.role)) {
    return redirectWithError(request, "/events", "forbidden");
  }

  const form = await request.formData();
  const next = safeReturnPath(typeof form.get("next") === "string" ? String(form.get("next")) : null);
  const title = formString(form, "title");
  const category = formString(form, "category");
  const startsAtRaw = formString(form, "starts_at");
  const location = formString(form, "location");
  const thumbnailUrl = formString(form, "thumbnail_url");
  const description = formString(form, "description");

  if (!title || title.length > 120) {
    return redirectWithError(request, "/events/new", "title");
  }
  if (!isEventCategory(category)) {
    return redirectWithError(request, "/events/new", "category");
  }
  const startsAt = parseEventDateTime(startsAtRaw);
  if (!startsAt) {
    return redirectWithError(request, "/events/new", "starts_at");
  }
  if (location.length > 200) {
    return redirectWithError(request, "/events/new", "location");
  }
  if (thumbnailUrl && (!/^https?:\/\//i.test(thumbnailUrl) || thumbnailUrl.length > 500)) {
    return redirectWithError(request, "/events/new", "thumbnail");
  }
  if (description.length > 2000) {
    return redirectWithError(request, "/events/new", "description");
  }

  await createEvent({
    title,
    category,
    startsAt,
    location: location || null,
    thumbnailUrl: thumbnailUrl || null,
    description: description || null,
    actor,
  });

  const dest = new URL(next, request.url);
  dest.searchParams.set("tab", startsAt.getTime() >= Date.now() ? "upcoming" : "past");
  dest.searchParams.set("created", "1");
  dest.searchParams.delete("error");
  return NextResponse.redirect(dest, { status: 303 });
}
