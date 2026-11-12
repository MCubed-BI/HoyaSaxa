import { NextResponse } from "next/server";
import {
  a2pPublicUrls,
  buildUsa2pBody,
  ensureGeorgetownBrandRegistration,
  isGeorgetownBrand,
} from "@/lib/a2p-brand";
import { getBlastActor } from "@/lib/blast-auth";
import { twilioAuth } from "@/lib/sms";

export const dynamic = "force-dynamic";

/**
 * Staff-only: Messaging Service + Georgetown Secondary Brand + Usa2p campaign.
 * Primary Nipsey Trust Hub profile is API-immutable; we create/reuse a Georgetown
 * Secondary Customer Profile + BrandRegistration so campaign website matches Brand.
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

    const { privacyPolicyUrl, termsAndConditionsUrl } = a2pPublicUrls();

    // 1) Georgetown Secondary Customer Profile + Brand (Primary Nipsey profile is immutable).
    const georgetownBrand = await ensureGeorgetownBrandRegistration(basic, auth.accountSid);

    let campaign: Record<string, unknown> | null = null;
    let campaignCreated = false;
    let campaignDeleted = false;
    let campaignError: string | null = null;

    const brand = georgetownBrand.brand;
    const brandSid = brand?.sid ?? null;
    const brandIsGeorgetown = isGeorgetownBrand(brand, georgetownBrand.secondaryProfileSid);

    const existingRes = await fetch(
      `https://messaging.twilio.com/v1/Services/${serviceSid}/Compliance/Usa2p?PageSize=20`,
      { headers: { Authorization: basic }, cache: "no-store" },
    );
    const existingPayload = (await existingRes.json().catch(() => ({}))) as {
      compliance?: Array<Record<string, unknown> & { sid?: string; campaign_status?: string; brand_registration_sid?: string }>;
      message?: string;
    };
    let existingCampaign:
      | (Record<string, unknown> & { sid?: string; campaign_status?: string; brand_registration_sid?: string })
      | null = (existingPayload.compliance ?? [])[0] ?? null;
    const existingStatus = String(existingCampaign?.campaign_status ?? "").toUpperCase();
    const existingBrandSid = String(existingCampaign?.brand_registration_sid ?? "");

    // 2) Drop FAILED campaigns, and IN_PROGRESS campaigns not on the Georgetown Brand
    // (those re-reject with 30907 website mismatch against Nipsey Primary).
    const onGeorgetownBrand = Boolean(brandSid) && existingBrandSid === brandSid;
    const shouldDelete =
      Boolean(existingCampaign?.sid) &&
      (existingStatus === "FAILED" || (existingStatus === "IN_PROGRESS" && !onGeorgetownBrand));

    if (shouldDelete && existingCampaign?.sid) {
      const delRes = await fetch(
        `https://messaging.twilio.com/v1/Services/${serviceSid}/Compliance/Usa2p/${existingCampaign.sid}`,
        { method: "DELETE", headers: { Authorization: basic } },
      );
      if (delRes.ok || delRes.status === 204) {
        campaignDeleted = true;
        existingCampaign = null;
      } else {
        const delPayload = (await delRes.json().catch(() => ({}))) as { message?: string };
        campaignError = delPayload.message || `Could not delete campaign (${delRes.status})`;
      }
    }

    if (existingCampaign) {
      campaign = existingCampaign;
    } else if (campaignError) {
      // keep delete error
    } else if (!georgetownBrand.ready || !brandSid || !brandIsGeorgetown) {
      campaignError =
        georgetownBrand.error ||
        "Georgetown BrandRegistration is not APPROVED yet. Secondary profile / Brand review must finish before Usa2p create.";
    } else {
      const usecasesRes = await fetch(
        `https://messaging.twilio.com/v1/Services/${serviceSid}/Compliance/Usa2p/Usecases?BrandRegistrationSid=${brandSid}`,
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
        const { body } = buildUsa2pBody(brandSid, usecase);
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

    const ok = attached && Boolean(campaign) && !campaignError && georgetownBrand.ready;
    return NextResponse.json({
      ok,
      created,
      messagingServiceSid: serviceSid,
      from: auth.from,
      attached,
      attachError,
      brandSid,
      brandStatus: brand?.status ?? null,
      brandType: brand?.brand_type ?? null,
      brandIsGeorgetown,
      georgetownBrand,
      consoleRequired: (georgetownBrand as { consoleRequired?: unknown }).consoleRequired ?? null,
      privacyPolicyUrl,
      termsAndConditionsUrl,
      campaignDeleted,
      campaignCreated,
      campaign,
      campaignError,
      vercelHint:
        "A2P Brand must be Georgetown Football Alum Network (Secondary Customer Profile + BrandRegistration) with website https://georgetown-alum.vercel.app. " +
        "Primary Nipsey Tech profile is API-immutable for direct_customer accounts; Secondary create requires Twilio Console or A2P Onboarding.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provision failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
