import { PRODUCT_DISPLAY_NAME } from "@/lib/product";
import { appBaseUrl } from "@/lib/sms";

/** Public site used for A2P Brand website + Privacy/Terms URLs. */
export function a2pBrandWebsite() {
  return (appBaseUrl() || "https://georgetown-alum.vercel.app").replace(/\/$/, "");
}

export function a2pPublicUrls() {
  const base = a2pBrandWebsite();
  return {
    privacyPolicyUrl: `${base}/privacy`,
    termsAndConditionsUrl: `${base}/terms`,
  };
}

/** Display / Brand identity for Georgetown Football Alum Network. */
export const A2P_BRAND_BUSINESS_NAME = PRODUCT_DISPLAY_NAME;
export const A2P_BRAND_FRIENDLY_NAME = "Georgetown Football Alum Network";

export function buildUsa2pBody(brandSid: string, usecase: string) {
  const website = a2pBrandWebsite();
  const { privacyPolicyUrl, termsAndConditionsUrl } = a2pPublicUrls();
  const description =
    `${A2P_BRAND_BUSINESS_NAME} (HoyaSaxa) sends low-volume SMS to opted-in Georgetown Football alumni and staff ` +
    `about alumni events, program updates, and operational notices. This is first-party program messaging only — ` +
    `not affiliate or third-party marketing. Brand website: ${website}.`;
  const messageFlow =
    `End users opt in by providing a mobile number on the Georgetown Football alumni roster and/or by using the ` +
    `${A2P_BRAND_BUSINESS_NAME} alum portal at ${website}. Consent is collected directly for ${A2P_BRAND_BUSINESS_NAME}. ` +
    `Privacy Policy: ${privacyPolicyUrl}. Terms: ${termsAndConditionsUrl}. ` +
    `Mobile numbers and messaging consent are not shared, sold, or provided to third parties or affiliates for marketing or promotional purposes. ` +
    `Users reply STOP to opt out and HELP for help. Message frequency varies; message and data rates may apply.`;
  const samples = [
    `${A2P_BRAND_BUSINESS_NAME}: Reminder — Georgetown Football alum event this Saturday at 2pm. Reply STOP to opt out.`,
    `HoyaSaxa (${A2P_BRAND_BUSINESS_NAME}): Update from Coach Sgarlata for Georgetown Football alumni. Reply HELP for help, STOP to opt out.`,
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
  return { body, privacyPolicyUrl, termsAndConditionsUrl, website };
}

type TwilioBasic = string;

async function twilioJson(url: string, basic: TwilioBasic, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: basic,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { response, payload };
}

/**
 * Align Trust Hub Customer Profile business EndUser with Georgetown branding + app website.
 * Keeps existing EIN / registration number (legal entity on the Twilio account).
 */
export async function syncGeorgetownBrandProfile(basic: TwilioBasic, customerProfileSid: string) {
  const website = a2pBrandWebsite();
  const steps: Array<Record<string, unknown>> = [];

  const profileRes = await twilioJson(
    `https://trusthub.twilio.com/v1/CustomerProfiles/${customerProfileSid}`,
    basic,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        FriendlyName: A2P_BRAND_FRIENDLY_NAME,
        Email: "mike@nipseytech.com",
      }),
    },
  );
  steps.push({
    step: "customer_profile_friendly_name",
    ok: profileRes.response.ok,
    status: profileRes.response.status,
    error: profileRes.response.ok ? null : profileRes.payload.message,
  });

  const assignsRes = await twilioJson(
    `https://trusthub.twilio.com/v1/CustomerProfiles/${customerProfileSid}/EntityAssignments?PageSize=50`,
    basic,
  );
  const results = (assignsRes.payload.results as Array<{ object_sid?: string }> | undefined) ?? [];

  for (const row of results) {
    const objectSid = row.object_sid ?? "";
    if (!objectSid.startsWith("IT")) continue;
    const endUserRes = await twilioJson(`https://trusthub.twilio.com/v1/EndUsers/${objectSid}`, basic);
    if (!endUserRes.response.ok) continue;
    const type = String(endUserRes.payload.type ?? "");
    if (type !== "customer_profile_business_information") continue;

    const attrs = {
      ...((endUserRes.payload.attributes as Record<string, unknown> | undefined) ?? {}),
      business_name: A2P_BRAND_BUSINESS_NAME,
      website_url: `${website}/`,
      business_industry: "EDUCATION",
      business_identity: "direct_customer",
      business_regions_of_operation: "USA_AND_CANADA",
    };
    // Keep EIN fields if present
    const updateRes = await twilioJson(`https://trusthub.twilio.com/v1/EndUsers/${objectSid}`, basic, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        FriendlyName: A2P_BRAND_FRIENDLY_NAME,
        Attributes: JSON.stringify(attrs),
      }),
    });
    steps.push({
      step: "end_user_business_information",
      sid: objectSid,
      ok: updateRes.response.ok,
      status: updateRes.response.status,
      website: attrs.website_url,
      businessName: attrs.business_name,
      error: updateRes.response.ok ? null : updateRes.payload.message,
      attributes: updateRes.response.ok ? (updateRes.payload.attributes ?? attrs) : null,
    });
  }

  return { website, steps };
}

/** Resubmit BrandRegistration after Trust Hub profile edits (empty POST). */
export async function resubmitBrandRegistration(basic: TwilioBasic, brandSid: string) {
  const { response, payload } = await twilioJson(
    `https://messaging.twilio.com/v1/a2p/BrandRegistrations/${brandSid}`,
    basic,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "" },
  );
  return {
    ok: response.ok,
    status: response.status,
    brand: payload,
    error: response.ok ? null : (payload.message as string | undefined) || `Brand update ${response.status}`,
  };
}
