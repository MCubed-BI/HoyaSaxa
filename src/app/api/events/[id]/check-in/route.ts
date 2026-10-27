import { NextResponse } from "next/server";
import {
  attendancePersonFromStaffInput,
  checkInToEvent,
  getEventById,
  isEventRecordId,
} from "@/lib/event-attendance";
import { getEventActor } from "@/lib/event-actor";
import { canStaffCheckInOthers } from "@/lib/event-auth";
import {
  attendancePersonFromCheckInQr,
  parseCheckInQrToken,
} from "@/lib/event-check-in-qr";

function safeReturnPath(value: string | null, eventId: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return `/events/${eventId}/check-in`;
  }
  return value;
}

function wantsJson(request: Request, form: FormData | null) {
  const accept = request.headers.get("accept") || "";
  if (accept.includes("application/json")) return true;
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return true;
  if (form && String(form.get("format") || "") === "json") return true;
  return false;
}

async function readBody(request: Request): Promise<{
  form: FormData | null;
  json: Record<string, unknown> | null;
}> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return { form: null, json };
  }
  const form = await request.formData().catch(() => null);
  return { form, json: null };
}

function field(form: FormData | null, json: Record<string, unknown> | null, key: string) {
  if (json && typeof json[key] === "string") return String(json[key]);
  if (form) {
    const value = form.get(key);
    if (typeof value === "string") return value;
  }
  return null;
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

  const { form, json } = await readBody(request);
  const next = safeReturnPath(field(form, json, "next"), id);
  const asJson = wantsJson(request, form);
  const qrToken = field(form, json, "token") || field(form, json, "qr");
  const override = field(form, json, "override") === "1" || field(form, json, "override") === "true";

  let person = null as ReturnType<typeof attendancePersonFromStaffInput>;
  if (qrToken) {
    if (!canStaffCheckInOthers(actor)) {
      if (asJson) {
        return NextResponse.json({ error: "Only admins can scan guest check-in codes." }, { status: 403 });
      }
      const dest = new URL(next, request.url);
      dest.searchParams.set("status", "forbidden");
      return NextResponse.redirect(dest, { status: 303 });
    }
    const payload = parseCheckInQrToken(qrToken, { eventId: id });
    if (!payload) {
      if (asJson) {
        return NextResponse.json({ error: "Invalid or expired check-in code." }, { status: 400 });
      }
      const dest = new URL(next, request.url);
      dest.searchParams.set("status", "invalid");
      return NextResponse.redirect(dest, { status: 303 });
    }
    person = attendancePersonFromCheckInQr(payload);
  } else if (canStaffCheckInOthers(actor)) {
    person = attendancePersonFromStaffInput({
      alumId: field(form, json, "alumId"),
      userId: field(form, json, "userId"),
      displayName: field(form, json, "displayName"),
    });
  }

  // Default: guests present a QR and an admin scans. Events with
  // self_check_in_allowed let the guest complete check-in themselves.
  if (!person && !canStaffCheckInOthers(actor)) {
    const event = await getEventById(id);
    if (!event?.selfCheckInAllowed) {
      if (asJson) {
        return NextResponse.json(
          { error: "Show your QR code to an admin to check in." },
          { status: 403 },
        );
      }
      const dest = new URL(next, request.url);
      dest.searchParams.set("status", "show-qr");
      return NextResponse.redirect(dest, { status: 303 });
    }
  }

  try {
    const result = await checkInToEvent({
      eventId: id,
      actor,
      person,
      override,
    });

    if (asJson) {
      return NextResponse.json({
        ok: true,
        action: result.action,
        alreadyCheckedIn: result.alreadyCheckedIn,
        record: result.record,
      });
    }

    const dest = new URL(next, request.url);
    dest.searchParams.set("status", result.alreadyCheckedIn ? "already" : "checked");
    if (result.record.displayName) {
      dest.searchParams.set("guest", result.record.displayName);
    }
    return NextResponse.redirect(dest, { status: 303 });
  } catch (error) {
    if (asJson) {
      return NextResponse.json(
        {
          error:
            error instanceof Error && error.message.includes("override")
              ? "Already checked in."
              : error instanceof Error
                ? error.message
                : "Check-in failed.",
        },
        { status: error instanceof Error && error.message.includes("override") ? 409 : 400 },
      );
    }
    const dest = new URL(next, request.url);
    dest.searchParams.set(
      "status",
      error instanceof Error && error.message.includes("override") ? "forbidden" : "error",
    );
    return NextResponse.redirect(dest, { status: 303 });
  }
}
