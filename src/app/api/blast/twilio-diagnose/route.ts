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

    if (url.searchParams.get("numbers") === "1") {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${auth.accountSid}/IncomingPhoneNumbers.json?PageSize=50`,
        { headers: { Authorization: basic }, cache: "no-store" },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        incoming_phone_numbers?: Array<{
          phone_number?: string;
          friendly_name?: string;
          capabilities?: { sms?: boolean; mms?: boolean; voice?: boolean };
        }>;
        message?: string;
      };
      if (!response.ok) {
        return NextResponse.json(
          { error: payload.message || `Twilio ${response.status}` },
          { status: 502 },
        );
      }
      return NextResponse.json({
        fromConfigured: auth.from,
        messagingServiceConfigured: auth.messagingServiceSid,
        numbers: (payload.incoming_phone_numbers ?? []).map((row) => ({
          phone: row.phone_number ?? null,
          friendlyName: row.friendly_name ?? null,
          sms: Boolean(row.capabilities?.sms),
        })),
      });
    }

    if (url.searchParams.get("a2p") === "1") {
      const messagingServiceSid = auth.messagingServiceSid;
      const brandsRes = await fetch("https://messaging.twilio.com/v1/a2p/BrandRegistrations?PageSize=20", {
        headers: { Authorization: basic },
        cache: "no-store",
      });
      const brandsPayload = (await brandsRes.json().catch(() => ({}))) as {
        data?: Array<{
          sid?: string;
          status?: string;
          brand_type?: string;
          tcr_id?: string;
          failure_reason?: string;
        }>;
        message?: string;
      };

      let usa2p: unknown = null;
      let usa2pError: string | null = null;
      if (messagingServiceSid) {
        const usa2pRes = await fetch(
          `https://messaging.twilio.com/v1/Services/${messagingServiceSid}/Compliance/Usa2p?PageSize=20`,
          { headers: { Authorization: basic }, cache: "no-store" },
        );
        const usa2pPayload = await usa2pRes.json().catch(() => ({}));
        if (usa2pRes.ok) {
          usa2p = usa2pPayload;
        } else {
          usa2pError =
            (usa2pPayload as { message?: string }).message || `Usa2p ${usa2pRes.status}`;
        }
      }

      // Pull Trust Hub customer profile / end-user website so campaign URLs can match Brand.
      const brandRows = brandsPayload.data ?? [];
      const profileBundles = [
        ...new Set(
          brandRows
            .map((row) => (row as { customer_profile_bundle_sid?: string }).customer_profile_bundle_sid)
            .filter((sid): sid is string => Boolean(sid)),
        ),
      ];
      const profiles = [];
      for (const profileSid of profileBundles) {
        const profileRes = await fetch(`https://trusthub.twilio.com/v1/CustomerProfiles/${profileSid}`, {
          headers: { Authorization: basic },
          cache: "no-store",
        });
        const profile = (await profileRes.json().catch(() => ({}))) as Record<string, unknown>;
        const assignsRes = await fetch(
          `https://trusthub.twilio.com/v1/CustomerProfiles/${profileSid}/EntityAssignments?PageSize=50`,
          { headers: { Authorization: basic }, cache: "no-store" },
        );
        const assignsPayload = (await assignsRes.json().catch(() => ({}))) as {
          results?: Array<{ object_sid?: string }>;
        };
        const endUsers = [];
        for (const row of assignsPayload.results ?? []) {
          const objectSid = row.object_sid ?? "";
          if (!objectSid.startsWith("IT")) continue;
          const endUserRes = await fetch(`https://trusthub.twilio.com/v1/EndUsers/${objectSid}`, {
            headers: { Authorization: basic },
            cache: "no-store",
          });
          const endUser = (await endUserRes.json().catch(() => ({}))) as {
            sid?: string;
            friendly_name?: string;
            type?: string;
            attributes?: Record<string, unknown>;
          };
          if (endUserRes.ok) {
            endUsers.push({
              sid: endUser.sid,
              friendlyName: endUser.friendly_name,
              type: endUser.type,
              attributes: endUser.attributes ?? {},
              website:
                (endUser.attributes?.website_url as string | undefined) ||
                (endUser.attributes?.website as string | undefined) ||
                null,
              businessName: (endUser.attributes?.business_name as string | undefined) || null,
            });
          }
        }
        profiles.push({
          sid: profileSid,
          ok: profileRes.ok,
          friendlyName: profile.friendly_name ?? null,
          email: profile.email ?? null,
          status: profile.status ?? null,
          endUsers,
        });
      }

      return NextResponse.json({
        fromConfigured: auth.from,
        messagingServiceConfigured: messagingServiceSid,
        brandsOk: brandsRes.ok,
        brandsError: brandsRes.ok ? null : brandsPayload.message || `Brands ${brandsRes.status}`,
        brands: brandRows,
        profiles,
        usa2p,
        usa2pError,
        hint: messagingServiceSid
          ? "If brands/usa2p are empty, finish Brand + Campaign registration in Twilio Console and link this Messaging Service."
          : "Set TWILIO_MESSAGING_SERVICE_SID first, then register Brand + Campaign.",
      });
    }

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
      return NextResponse.json({ error: "Pass ?to=+1…, ?services=1, or ?a2p=1" }, { status: 400 });
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
