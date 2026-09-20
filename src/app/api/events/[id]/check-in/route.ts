import { NextResponse } from "next/server";
import {
  attendancePersonFromStaffInput,
  checkInToEvent,
  isEventRecordId,
} from "@/lib/event-attendance";
import { canOverrideEventCheckIn } from "@/lib/event-auth";
import { getEventActor } from "@/lib/event-actor";

function safeReturnPath(value: string | null, eventId: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return `/events/${eventId}/check-in`;
  }
  return value;
}

function formString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
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
  const override = form?.get("override") === "1" || form?.get("override") === "on";
  const staff = canOverrideEventCheckIn(actor.role);
  const guest = staff
    ? attendancePersonFromStaffInput({
        alumId: formString(form ?? new FormData(), "alum_id"),
        userId: formString(form ?? new FormData(), "user_id"),
        displayName: formString(form ?? new FormData(), "user_id"),
      })
    : null;

  if (staff && (formString(form ?? new FormData(), "user_id") || formString(form ?? new FormData(), "alum_id")) && !guest) {
    const dest = new URL(next, request.url);
    dest.searchParams.set("status", "guest");
    return NextResponse.redirect(dest, { status: 303 });
  }

  try {
    const result = await checkInToEvent({
      eventId: id,
      actor,
      person: guest,
      override: staff && override,
    });

    const dest = new URL(next, request.url);
    dest.searchParams.set(
      "status",
      result.action === "override" ? "updated" : result.alreadyCheckedIn ? "already" : "checked",
    );
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
