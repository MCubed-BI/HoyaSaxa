import { NextResponse } from "next/server";
import { getBlastActor } from "@/lib/blast-auth";
import { twilioAuth } from "@/lib/sms";

export const dynamic = "force-dynamic";

/**
 * Staff-only: ensure a Messaging Service exists and includes TWILIO_FROM_NUMBER.
 * Does not complete A2P Brand/Campaign registration (Twilio Console still required).
 */
export async function POST() {
  try {
    const actor = await getBlastActor();
    if (!actor || actor.kind !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = twilioAuth();
    if (!auth) {
      return NextResponse.json({ error: "Twilio is not configured" }, { status: 503 });
    }
    if (!auth.from) {
      return NextResponse.json({ error: "TWILIO_FROM_NUMBER is required to provision a sender pool" }, { status: 400 });
    }

    const basic = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`;

    const listRes = await fetch("https://messaging.twilio.com/v1/Services?PageSize=20", {
      headers: { Authorization: basic },
      cache: "no-store",
    });
    const listPayload = (await listRes.json().catch(() => ({}))) as {
      services?: Array<{ sid?: string; friendly_name?: string }>;
      message?: string;
    };
    if (!listRes.ok) {
      return NextResponse.json({ error: listPayload.message || `Twilio ${listRes.status}` }, { status: 502 });
    }

    let serviceSid =
      listPayload.services?.find((row) => /hoya|georgetown|alum|blast/i.test(row.friendly_name ?? ""))?.sid ||
      listPayload.services?.[0]?.sid ||
      null;
    let created = false;

    if (!serviceSid) {
      const createRes = await fetch("https://messaging.twilio.com/v1/Services", {
        method: "POST",
        headers: {
          Authorization: basic,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          FriendlyName: "HoyaSaxa Blast",
          UseInboundWebhookOnNumber: "false",
        }),
      });
      const createdPayload = (await createRes.json().catch(() => ({}))) as {
        sid?: string;
        message?: string;
      };
      if (!createRes.ok || !createdPayload.sid) {
        return NextResponse.json(
          { error: createdPayload.message || `Could not create Messaging Service (${createRes.status})` },
          { status: 502 },
        );
      }
      serviceSid = createdPayload.sid;
      created = true;
    }

    const numbersRes = await fetch(
      `https://messaging.twilio.com/v1/Services/${serviceSid}/PhoneNumbers?PageSize=20`,
      { headers: { Authorization: basic }, cache: "no-store" },
    );
    const numbersPayload = (await numbersRes.json().catch(() => ({}))) as {
      phone_numbers?: Array<{ phone_number?: string; sid?: string }>;
    };
    const alreadyAttached = (numbersPayload.phone_numbers ?? []).some((row) => row.phone_number === auth.from);

    let attached = alreadyAttached;
    let attachError: string | null = null;
    if (!alreadyAttached) {
      // Resolve Incoming Phone Number SID for From
      const incomingRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${auth.accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(auth.from)}`,
        { headers: { Authorization: basic }, cache: "no-store" },
      );
      const incomingPayload = (await incomingRes.json().catch(() => ({}))) as {
        incoming_phone_numbers?: Array<{ sid?: string; phone_number?: string }>;
        message?: string;
      };
      const phoneSid = incomingPayload.incoming_phone_numbers?.[0]?.sid;
      if (!phoneSid) {
        attachError =
          incomingPayload.message ||
          `Could not find Incoming Phone Number SID for ${auth.from}. Buy/verify the number in Twilio first.`;
      } else {
        const attachRes = await fetch(`https://messaging.twilio.com/v1/Services/${serviceSid}/PhoneNumbers`, {
          method: "POST",
          headers: {
            Authorization: basic,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ PhoneNumberSid: phoneSid }),
        });
        const attachPayload = (await attachRes.json().catch(() => ({}))) as { message?: string; sid?: string };
        if (!attachRes.ok) {
          attachError = attachPayload.message || `Attach failed (${attachRes.status})`;
        } else {
          attached = true;
        }
      }
    }

    return NextResponse.json({
      ok: attached,
      created,
      messagingServiceSid: serviceSid,
      from: auth.from,
      attached,
      attachError,
      vercelHint: `Set TWILIO_MESSAGING_SERVICE_SID=${serviceSid} on Vercel (production + preview), then complete A2P Brand/Campaign registration so carriers stop returning 30034.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provision failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
