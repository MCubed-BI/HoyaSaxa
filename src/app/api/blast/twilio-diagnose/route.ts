import { NextResponse } from "next/server";
import { getBlastActor } from "@/lib/blast-auth";
import { firstValidE164, toE164 } from "@/lib/phone";
import { twilioAuth } from "@/lib/sms";

export const dynamic = "force-dynamic";

/**
 * Staff-only: list recent Twilio messages for a destination number.
 * Used to inspect carrier reject codes (e.g. Danielle undelivered).
 */
export async function GET(request: Request) {
  try {
    const actor = await getBlastActor();
    if (!actor || actor.kind !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = twilioAuth();
    if (!auth) {
      return NextResponse.json({ error: "Twilio is not configured" }, { status: 503 });
    }

    const url = new URL(request.url);
    const basic = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`;

    if (url.searchParams.get("services") === "1") {
      const response = await fetch(
        `https://messaging.twilio.com/v1/Services?PageSize=20`,
        { headers: { Authorization: basic }, cache: "no-store" },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        services?: Array<{
          sid?: string;
          friendly_name?: string;
          date_created?: string;
          inbound_request_url?: string | null;
        }>;
        message?: string;
      };
      if (!response.ok) {
        return NextResponse.json(
          { error: payload.message || `Twilio ${response.status}` },
          { status: 502 },
        );
      }
      const services = [];
      for (const service of payload.services ?? []) {
        if (!service.sid) continue;
        const numbersRes = await fetch(
          `https://messaging.twilio.com/v1/Services/${service.sid}/PhoneNumbers?PageSize=20`,
          { headers: { Authorization: basic }, cache: "no-store" },
        );
        const numbersPayload = (await numbersRes.json().catch(() => ({}))) as {
          phone_numbers?: Array<{ phone_number?: string; sid?: string }>;
        };
        services.push({
          sid: service.sid,
          friendlyName: service.friendly_name ?? null,
          dateCreated: service.date_created ?? null,
          phoneNumbers: (numbersPayload.phone_numbers ?? []).map((row) => row.phone_number).filter(Boolean),
        });
      }
      return NextResponse.json({
        fromConfigured: auth.from,
        messagingServiceConfigured: auth.messagingServiceSid,
        services,
      });
    }

    const toRaw = url.searchParams.get("to")?.trim() ?? "";
    const to = firstValidE164(toRaw) ?? toE164(toRaw);
    if (!to) {
      return NextResponse.json({ error: "Pass ?to=+1… or ?services=1" }, { status: 400 });
    }

    const params = new URLSearchParams({
      To: to,
      PageSize: "20",
    });
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${auth.accountSid}/Messages.json?${params}`,
      {
        headers: {
          Authorization: basic,
        },
        cache: "no-store",
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      messages?: Array<{
        sid?: string;
        status?: string;
        to?: string;
        from?: string;
        error_code?: number | string | null;
        error_message?: string | null;
        body?: string;
        date_created?: string;
        date_sent?: string;
        date_updated?: string;
        messaging_service_sid?: string | null;
      }>;
      message?: string;
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.message || `Twilio ${response.status}` },
        { status: 502 },
      );
    }

    const messages = (payload.messages ?? []).map((row) => ({
      sid: row.sid,
      status: row.status,
      to: row.to,
      from: row.from,
      messagingServiceSid: row.messaging_service_sid ?? null,
      errorCode: row.error_code ?? null,
      errorMessage: row.error_message ?? null,
      bodyPreview: (row.body ?? "").slice(0, 80),
      dateCreated: row.date_created,
      dateSent: row.date_sent,
      dateUpdated: row.date_updated,
    }));

    return NextResponse.json({
      to,
      fromConfigured: auth.from,
      messagingServiceConfigured: auth.messagingServiceSid,
      authMode: auth.mode,
      count: messages.length,
      messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Diagnose failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
