import { NextResponse } from "next/server";
import { getBlastActor } from "@/lib/blast-auth";
import { appBaseUrl, twilioAuth } from "@/lib/sms";

export const dynamic = "force-dynamic";

function a2pPublicUrls() {
  const base = (appBaseUrl() || "https://georgetown-alum.vercel.app").replace(/\/$/, "");
  return {
    privacyPolicyUrl: `${base}/privacy`,
    termsAndConditionsUrl: `${base}/terms`,
  };
}

function buildUsa2pBody(brandSid: string, usecase: string) {
  const { privacyPolicyUrl, termsAndConditionsUrl } = a2pPublicUrls();
  const description =
    "Georgetown Football Alum Network (HoyaSaxa) sends low-volume SMS to opted-in Georgetown Football alumni and staff about alumni events, program updates, and operational notices. This is first-party program messaging only — not affiliate or third-party marketing.";
  const messageFlow =
    `End users opt in by providing a mobile number on the Georgetown Football alumni roster and/or by using the HoyaSaxa alum portal at ${appBaseUrl() || "https://georgetown-alum.vercel.app"}. ` +
    `Consent is collected directly for Georgetown Football Alum Network. ` +
    `Privacy Policy: ${privacyPolicyUrl}. Terms: ${termsAndConditionsUrl}. ` +
    `Mobile numbers and messaging consent are not shared, sold, or provided to third parties or affiliates for marketing or promotional purposes. ` +
    `Users reply STOP to opt out and HELP for help. Message frequency varies; message and data rates may apply.`;
  const samples = [
    "HoyaSaxa (Georgetown Football Alum Network): Reminder — alum event this Saturday at 2pm. Reply STOP to opt out.",
    "HoyaSaxa: Update from Coach Sgarlata for Georgetown Football alumni. Reply HELP for help, STOP to opt out.",
  ];
  const body = new URLSearchParams();
  body.set("BrandRegistrationSid", brandSid);
  body.set("Description", description);
  body.set("MessageFlow", messageFlow);
  for (const sample of samples) body.append("MessageSamples", sample);
  body.set("UsAppToPersonUsecase", usecase);
  body.set("HasEmbeddedLinks", "false");
  body.set("HasEmbeddedPhone", "false");
  body.set("PrivacyPolicyUrl", privacyPolicyUrl);
  body.set("TermsAndConditionsUrl", termsAndConditionsUrl);
  return { body, privacyPolicyUrl, termsAndConditionsUrl };
}

/**
 * Staff-only: ensure a Messaging Service exists, includes TWILIO_FROM_NUMBER,
 * and creates a Usa2p campaign under an approved Brand when none is linked yet.
 * Failed campaigns (e.g. missing privacy/terms URLs) are deleted and resubmitted.
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

    // Brand is often already approved; campaign must be linked to THIS Messaging Service.
    const brandsRes = await fetch("https://messaging.twilio.com/v1/a2p/BrandRegistrations?PageSize=20", {
      headers: { Authorization: basic },
      cache: "no-store",
    });
    const brandsPayload = (await brandsRes.json().catch(() => ({}))) as {
      data?: Array<{ sid?: string; status?: string; brand_type?: string }>;
    };
    const brand =
      (brandsPayload.data ?? []).find((row) => (row.status ?? "").toUpperCase() === "APPROVED") ||
      (brandsPayload.data ?? [])[0] ||
      null;

    let campaign: Record<string, unknown> | null = null;
    let campaignCreated = false;
    let campaignDeleted = false;
    let campaignError: string | null = null;
    const { privacyPolicyUrl, termsAndConditionsUrl } = a2pPublicUrls();

    const existingRes = await fetch(
      `https://messaging.twilio.com/v1/Services/${serviceSid}/Compliance/Usa2p?PageSize=20`,
      { headers: { Authorization: basic }, cache: "no-store" },
    );
    const existingPayload = (await existingRes.json().catch(() => ({}))) as {
      compliance?: Array<Record<string, unknown> & { sid?: string; campaign_status?: string }>;
      message?: string;
    };
    let existingCampaign = (existingPayload.compliance ?? [])[0] ?? null;
    const existingStatus = String(existingCampaign?.campaign_status ?? "").toUpperCase();

    // Failed campaigns missing PrivacyPolicyUrl / TermsAndConditionsUrl must be replaced.
    if (existingCampaign?.sid && existingStatus === "FAILED") {
      const delRes = await fetch(
        `https://messaging.twilio.com/v1/Services/${serviceSid}/Compliance/Usa2p/${existingCampaign.sid}`,
        { method: "DELETE", headers: { Authorization: basic } },
      );
      if (delRes.ok || delRes.status === 204) {
        campaignDeleted = true;
        existingCampaign = null;
      } else {
        const delPayload = (await delRes.json().catch(() => ({}))) as { message?: string };
        campaignError = delPayload.message || `Could not delete failed campaign (${delRes.status})`;
      }
    }

    if (existingCampaign) {
      campaign = existingCampaign;
    } else if (campaignError) {
      // keep delete error
    } else if (!brand?.sid) {
      campaignError = "No A2P BrandRegistration found. Complete Brand registration in Twilio Console first.";
    } else {
      const usecasesRes = await fetch(
        `https://messaging.twilio.com/v1/Services/${serviceSid}/Compliance/Usa2p/Usecases?BrandRegistrationSid=${brand.sid}`,
        { headers: { Authorization: basic }, cache: "no-store" },
      );
      const usecasesPayload = (await usecasesRes.json().catch(() => ({}))) as {
        us_app_to_person_usecases?: Array<{ code?: string; name?: string }>;
        message?: string;
      };
      const available = (usecasesPayload.us_app_to_person_usecases ?? [])
        .map((row) => row.code)
        .filter((code): code is string => Boolean(code));
      const preferred = ["LOW_VOLUME", "CUSTOMER_CARE", "ACCOUNT_NOTIFICATION", "MARKETING", "MIXED"].find((code) =>
        available.includes(code),
      );
      const usecase = preferred || available[0];
      if (!usecase) {
        campaignError =
          usecasesPayload.message ||
          "No A2P usecases available for this Brand/Messaging Service. Check Twilio Console.";
      } else {
        const { body } = buildUsa2pBody(brand.sid, usecase);
        const createCampaignRes = await fetch(
          `https://messaging.twilio.com/v1/Services/${serviceSid}/Compliance/Usa2p`,
          {
            method: "POST",
            headers: {
              Authorization: basic,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
          },
        );
        const createdCampaign = (await createCampaignRes.json().catch(() => ({}))) as Record<string, unknown> & {
          message?: string;
          sid?: string;
        };
        if (!createCampaignRes.ok) {
          campaignError = createdCampaign.message || `Campaign create failed (${createCampaignRes.status})`;
        } else {
          campaign = createdCampaign;
          campaignCreated = true;
        }
      }
    }

    const ok = attached && Boolean(campaign) && !campaignError;
    return NextResponse.json({
      ok,
      created,
      messagingServiceSid: serviceSid,
      from: auth.from,
      attached,
      attachError,
      brandSid: brand?.sid ?? null,
      brandStatus: brand?.status ?? null,
      brandType: brand?.brand_type ?? null,
      privacyPolicyUrl,
      termsAndConditionsUrl,
      campaignDeleted,
      campaignCreated,
      campaign,
      campaignError,
      vercelHint: `TWILIO_MESSAGING_SERVICE_SID=${serviceSid} should already be set. Campaign review can take time; carriers stop 30034 after the Usa2p campaign is VERIFIED/APPROVED.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provision failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
