import { NextResponse } from "next/server";
import { getEventActor } from "@/lib/event-actor";
import { toggleEventRsvp } from "@/lib/event-queries";

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/events?tab=mine";
  return value;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getEventActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  await toggleEventRsvp(id, actor);

  const form = await request.formData().catch(() => null);
  const next = safeReturnPath(form && typeof form.get("next") === "string" ? String(form.get("next")) : null);
  return NextResponse.redirect(new URL(next, request.url), { status: 303 });
}
