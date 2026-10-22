import { NextResponse } from "next/server";
import { checkInToEvent, isEventRecordId } from "@/lib/event-attendance";
import { getEventActor } from "@/lib/event-actor";

function safeReturnPath(value: string | null, eventId: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return `/events/${eventId}/check-in`;
  }
  return value;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getEventActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isEventRecordId(id)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  const next = safeReturnPath(form && typeof form.get("next") === "string" ? String(form.get("next")) : null, id);

  try {
    const result = await checkInToEvent({
      eventId: id,
      actor,
    });

    const dest = new URL(next, request.url);
    dest.searchParams.set("status", result.alreadyCheckedIn ? "already" : "checked");
    return NextResponse.redirect(dest, { status: 303 });
  } catch (error) {
    const dest = new URL(next, request.url);
    dest.searchParams.set(
      "status",
      error instanceof Error && error.message.includes("override") ? "forbidden" : "error",
    );
    return NextResponse.redirect(dest, { status: 303 });
  }
}
