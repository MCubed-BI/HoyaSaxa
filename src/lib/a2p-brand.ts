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

/** Trust Hub policy for Secondary Customer Profiles (ISV / additional brands). */
export const SECONDARY_CUSTOMER_PROFILE_POLICY = "RNdfbf3fae0e1107f8aded0e7cead80bf5";
/** Trust Hub policy for A2P Messaging TrustProducts. */
export const A2P_TRUST_PRODUCT_POLICY = "RNb0d4771c2c98518d916a3d4cd70a8f8b";

const CONTACT_EMAIL = "mike@nipseytech.com";

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

function formBody(fields: Record<string, string>) {
  return new URLSearchParams(fields);
}

function isGeorgetownProfileName(name: string | null | undefined) {
  const n = (name ?? "").toLowerCase();
  return n.includes("georgetown") || n.includes("hoyasaxa") || n.includes("alum network");
}

function profileStatusReady(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  return s === "twilio-approved" || s === "approved";
}

/**
 * Align Trust Hub Customer Profile business EndUser with Georgetown branding + app website.
 * Keeps existing EIN / registration number (legal entity on the Twilio account).
 * Note: Primary Customer Profiles that are already approved are API-immutable — use
 * ensureGeorgetownBrandRegistration() to create a Secondary profile + new Brand instead.
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
      body: formBody({
        FriendlyName: A2P_BRAND_FRIENDLY_NAME,
        Email: CONTACT_EMAIL,
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
    const updateRes = await twilioJson(`https://trusthub.twilio.com/v1/EndUsers/${objectSid}`, basic, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({
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

type BrandRow = {
  sid?: string;
  status?: string;
  brand_type?: string;
  customer_profile_bundle_sid?: string;
  a2p_profile_bundle_sid?: string;
  failure_reason?: string;
};

type ProfileRow = {
  sid?: string;
  friendly_name?: string;
  email?: string;
  status?: string;
  policy_sid?: string;
};

async function listCustomerProfiles(basic: TwilioBasic) {
  const { response, payload } = await twilioJson(
    "https://trusthub.twilio.com/v1/CustomerProfiles?PageSize=50",
    basic,
  );
  const results = (payload.results as ProfileRow[] | undefined) ?? [];
  return { ok: response.ok, error: response.ok ? null : payload.message, results };
}

async function listTrustProducts(basic: TwilioBasic) {
  const { response, payload } = await twilioJson(
    "https://trusthub.twilio.com/v1/TrustProducts?PageSize=50",
    basic,
  );
  const results =
    (payload.results as Array<{ sid?: string; friendly_name?: string; status?: string; policy_sid?: string }> | undefined) ??
    [];
  return { ok: response.ok, error: response.ok ? null : payload.message, results };
}

async function listBrandRegistrations(basic: TwilioBasic) {
  const { response, payload } = await twilioJson(
    "https://messaging.twilio.com/v1/a2p/BrandRegistrations?PageSize=20",
    basic,
  );
  const data = (payload.data as BrandRow[] | undefined) ?? [];
  return { ok: response.ok, error: response.ok ? null : payload.message, data };
}

async function readPrimaryBusinessSeed(basic: TwilioBasic, primarySid: string) {
  const assignsRes = await twilioJson(
    `https://trusthub.twilio.com/v1/CustomerProfiles/${primarySid}/EntityAssignments?PageSize=50`,
    basic,
  );
  const results = (assignsRes.payload.results as Array<{ object_sid?: string }> | undefined) ?? [];
  let business: Record<string, unknown> = {};
  let representative: Record<string, unknown> = {
    first_name: "Mike",
    last_name: "Kasten",
    email: CONTACT_EMAIL,
    phone_number: "+17328616973",
    business_title: "Consultant",
    job_position: "CEO",
  };
  let addressSid: string | null = null;

  for (const row of results) {
    const objectSid = row.object_sid ?? "";
    if (objectSid.startsWith("IT")) {
      const endUserRes = await twilioJson(`https://trusthub.twilio.com/v1/EndUsers/${objectSid}`, basic);
      if (!endUserRes.response.ok) continue;
      const type = String(endUserRes.payload.type ?? "");
      const attrs = (endUserRes.payload.attributes as Record<string, unknown> | undefined) ?? {};
      if (type === "customer_profile_business_information") {
        business = attrs;
      } else if (type === "authorized_representative_1") {
        representative = attrs;
      }
    } else if (objectSid.startsWith("RD")) {
      const docRes = await twilioJson(`https://trusthub.twilio.com/v1/SupportingDocuments/${objectSid}`, basic);
      if (!docRes.response.ok) continue;
      const attrs = (docRes.payload.attributes as Record<string, unknown> | undefined) ?? {};
      const addressSids = attrs.address_sids;
      if (typeof addressSids === "string" && addressSids.startsWith("AD")) {
        addressSid = addressSids;
      } else if (Array.isArray(addressSids) && typeof addressSids[0] === "string") {
        addressSid = addressSids[0];
      }
    }
  }

  return { business, representative, addressSid };
}

async function resolveAddressSid(basic: TwilioBasic, accountSid: string, seedAddressSid: string | null) {
  if (seedAddressSid) return seedAddressSid;
  const { response, payload } = await twilioJson(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Addresses.json?PageSize=20`,
    basic,
  );
  if (!response.ok) return null;
  const addresses = (payload.addresses as Array<{ sid?: string }> | undefined) ?? [];
  return addresses[0]?.sid ?? null;
}

async function evaluateAndSubmitCustomerProfile(basic: TwilioBasic, profileSid: string, steps: Array<Record<string, unknown>>) {
  const evalRes = await twilioJson(
    `https://trusthub.twilio.com/v1/CustomerProfiles/${profileSid}/Evaluations`,
    basic,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({ PolicySid: SECONDARY_CUSTOMER_PROFILE_POLICY }),
    },
  );
  steps.push({
    step: "customer_profile_evaluate",
    ok: evalRes.response.ok,
    status: evalRes.response.status,
    statusResult: evalRes.payload.status,
    error: evalRes.response.ok ? null : evalRes.payload.message,
  });

  const submitRes = await twilioJson(`https://trusthub.twilio.com/v1/CustomerProfiles/${profileSid}`, basic, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody({ Status: "pending-review" }),
  });
  steps.push({
    step: "customer_profile_submit",
    ok: submitRes.response.ok,
    status: submitRes.response.status,
    profileStatus: submitRes.payload.status,
    error: submitRes.response.ok ? null : submitRes.payload.message,
  });
  return submitRes.payload.status as string | undefined;
}

async function evaluateAndSubmitTrustProduct(basic: TwilioBasic, trustSid: string, steps: Array<Record<string, unknown>>) {
  const evalRes = await twilioJson(
    `https://trusthub.twilio.com/v1/TrustProducts/${trustSid}/Evaluations`,
    basic,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({ PolicySid: A2P_TRUST_PRODUCT_POLICY }),
    },
  );
  steps.push({
    step: "trust_product_evaluate",
    ok: evalRes.response.ok,
    status: evalRes.response.status,
    statusResult: evalRes.payload.status,
    error: evalRes.response.ok ? null : evalRes.payload.message,
  });

  const submitRes = await twilioJson(`https://trusthub.twilio.com/v1/TrustProducts/${trustSid}`, basic, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody({ Status: "pending-review" }),
  });
  steps.push({
    step: "trust_product_submit",
    ok: submitRes.response.ok,
    status: submitRes.response.status,
    trustStatus: submitRes.payload.status,
    error: submitRes.response.ok ? null : submitRes.payload.message,
  });
  return submitRes.payload.status as string | undefined;
}

/**
 * Create (or resume) a Georgetown Secondary Customer Profile + A2P TrustProduct + BrandRegistration.
 * Primary Customer Profile (Nipsey Tech) is API-immutable once approved; Secondary is the supported path
 * for a Brand whose website/name must be Georgetown Football Alum Network.
 */
export async function ensureGeorgetownBrandRegistration(basic: TwilioBasic, accountSid: string) {
  const website = a2pBrandWebsite();
  const steps: Array<Record<string, unknown>> = [];

  const profiles = await listCustomerProfiles(basic);
  steps.push({ step: "list_customer_profiles", ok: profiles.ok, count: profiles.results.length, error: profiles.error });
  if (!profiles.ok) {
    return { ok: false, ready: false, website, steps, brand: null, secondaryProfileSid: null, trustProductSid: null, error: String(profiles.error || "Could not list Customer Profiles") };
  }

  const primary =
    profiles.results.find((row) => (row.friendly_name ?? "").toLowerCase().includes("nipsey")) ||
    profiles.results.find((row) => profileStatusReady(row.status) && row.policy_sid !== SECONDARY_CUSTOMER_PROFILE_POLICY) ||
    profiles.results[0] ||
    null;
  const primarySid = primary?.sid;
  if (!primarySid) {
    return { ok: false, ready: false, website, steps, brand: null, secondaryProfileSid: null, trustProductSid: null, error: "No Primary Customer Profile found on this Twilio account" };
  }
  steps.push({ step: "primary_profile", sid: primarySid, friendlyName: primary?.friendly_name, status: primary?.status });

  let secondary =
    profiles.results.find(
      (row) =>
        row.sid !== primarySid &&
        isGeorgetownProfileName(row.friendly_name) &&
        (row.policy_sid === SECONDARY_CUSTOMER_PROFILE_POLICY || !row.policy_sid),
    ) ||
    profiles.results.find((row) => row.sid !== primarySid && isGeorgetownProfileName(row.friendly_name)) ||
    null;

  const seed = await readPrimaryBusinessSeed(basic, primarySid);
  const addressSid = await resolveAddressSid(basic, accountSid, seed.addressSid);
  steps.push({
    step: "seed_from_primary",
    ein: seed.business.business_registration_number ?? null,
    hasAddress: Boolean(addressSid),
    addressSid,
    repEmail: seed.representative.email ?? CONTACT_EMAIL,
  });

  if (!secondary) {
    if (!addressSid) {
      return {
        ok: false,
        ready: false,
        website,
        steps,
        brand: null,
        secondaryProfileSid: null,
        trustProductSid: null,
        error:
          "Cannot create Georgetown Secondary Customer Profile: no mailing Address on the Twilio account. Add an Address in Console or attach one to the Primary profile.",
      };
    }

    const createProfile = await twilioJson("https://trusthub.twilio.com/v1/CustomerProfiles", basic, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({
        FriendlyName: `${A2P_BRAND_FRIENDLY_NAME} Secondary Profile`,
        Email: CONTACT_EMAIL,
        PolicySid: SECONDARY_CUSTOMER_PROFILE_POLICY,
      }),
    });
    steps.push({
      step: "create_secondary_profile",
      ok: createProfile.response.ok,
      status: createProfile.response.status,
      sid: createProfile.payload.sid,
      error: createProfile.response.ok ? null : createProfile.payload.message,
    });
    if (!createProfile.response.ok || !createProfile.payload.sid) {
      const msg = String(createProfile.payload.message || "Secondary Customer Profile create failed");
      const consoleOnly = /only be created through Twilio console/i.test(msg);
      return {
        ok: false,
        ready: false,
        website,
        steps,
        brand: null,
        secondaryProfileSid: null,
        trustProductSid: null,
        error: msg,
        consoleRequired: consoleOnly
          ? {
              reason:
                "This Twilio account is a direct_customer. Secondary Customer Profiles (and Primary EndUser edits while approved) must be done in Twilio Console or via Twilio A2P Onboarding.",
              primaryProfileSid: primarySid,
              existingBrandSid: null as string | null,
              emailSentHint:
                "A correction request was sent to 10dlc-onboarding@twilio.com for Brand BN639351… → Georgetown Football Alum Network + https://georgetown-alum.vercel.app/",
              consoleSteps: [
                "Open https://console.twilio.com/ → Trust Hub → Customer Profiles",
                `Create Secondary Customer Profile: ${A2P_BRAND_FRIENDLY_NAME}`,
                `Business name: ${A2P_BRAND_BUSINESS_NAME}`,
                `Website: ${website}/`,
                "Industry: EDUCATION; keep EIN 99-4019340; rep Mike Kasten / mike@nipseytech.com",
                "Register a new Standard A2P Brand on that Georgetown Secondary profile",
                "OR ask Twilio to set Primary business identity to ISV Reseller/Partner, then re-run POST /api/blast/twilio-provision",
                "OR edit Primary profile (if Console allows) to Georgetown name + website, then resubmit Brand",
              ],
              fields: {
                businessName: A2P_BRAND_BUSINESS_NAME,
                website: `${website}/`,
                privacyPolicyUrl: a2pPublicUrls().privacyPolicyUrl,
                termsAndConditionsUrl: a2pPublicUrls().termsAndConditionsUrl,
                industry: "EDUCATION",
                ein: String(seed.business.business_registration_number || "99-4019340"),
              },
            }
          : null,
      };
    }
    secondary = {
      sid: String(createProfile.payload.sid),
      friendly_name: String(createProfile.payload.friendly_name ?? ""),
      status: String(createProfile.payload.status ?? "draft"),
      email: CONTACT_EMAIL,
      policy_sid: SECONDARY_CUSTOMER_PROFILE_POLICY,
    };

    const businessAttrs = {
      business_name: A2P_BRAND_BUSINESS_NAME,
      website_url: `${website}/`,
      business_regions_of_operation: "USA_AND_CANADA",
      business_type: String(seed.business.business_type || "Sole Proprietorship"),
      business_registration_identifier: String(seed.business.business_registration_identifier || "EIN"),
      business_identity: "direct_customer",
      business_industry: "EDUCATION",
      business_registration_number: String(seed.business.business_registration_number || ""),
      social_media_profile_urls: String(seed.business.social_media_profile_urls || ""),
    };
    if (!businessAttrs.business_registration_number) {
      return {
        ok: false,
        ready: false,
        website,
        steps,
        brand: null,
        secondaryProfileSid: secondary.sid ?? null,
        trustProductSid: null,
        error: "Primary profile has no EIN/business_registration_number to clone onto the Georgetown Brand.",
      };
    }

    const bizUser = await twilioJson("https://trusthub.twilio.com/v1/EndUsers", basic, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({
        FriendlyName: `${A2P_BRAND_FRIENDLY_NAME} Business Information`,
        Type: "customer_profile_business_information",
        Attributes: JSON.stringify(businessAttrs),
      }),
    });
    steps.push({
      step: "create_business_end_user",
      ok: bizUser.response.ok,
      sid: bizUser.payload.sid,
      error: bizUser.response.ok ? null : bizUser.payload.message,
      businessName: businessAttrs.business_name,
      website: businessAttrs.website_url,
    });

    const repAttrs = {
      first_name: String(seed.representative.first_name || "Mike"),
      last_name: String(seed.representative.last_name || "Kasten"),
      email: String(seed.representative.email || CONTACT_EMAIL),
      phone_number: String(seed.representative.phone_number || "+17328616973"),
      business_title: String(seed.representative.business_title || "Consultant"),
      job_position: String(seed.representative.job_position || "CEO"),
    };
    const repUser = await twilioJson("https://trusthub.twilio.com/v1/EndUsers", basic, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({
        FriendlyName: `${A2P_BRAND_FRIENDLY_NAME} Authorized Rep`,
        Type: "authorized_representative_1",
        Attributes: JSON.stringify(repAttrs),
      }),
    });
    steps.push({
      step: "create_authorized_rep",
      ok: repUser.response.ok,
      sid: repUser.payload.sid,
      error: repUser.response.ok ? null : repUser.payload.message,
    });

    const addressDoc = await twilioJson("https://trusthub.twilio.com/v1/SupportingDocuments", basic, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({
        FriendlyName: `${A2P_BRAND_FRIENDLY_NAME} Address`,
        Type: "customer_profile_address",
        Attributes: JSON.stringify({ address_sids: addressSid }),
      }),
    });
    steps.push({
      step: "create_address_supporting_document",
      ok: addressDoc.response.ok,
      sid: addressDoc.payload.sid,
      error: addressDoc.response.ok ? null : addressDoc.payload.message,
      addressSid,
    });

    const assignObject = async (objectSid: string | undefined, label: string) => {
      if (!objectSid || !secondary?.sid) return;
      const assign = await twilioJson(
        `https://trusthub.twilio.com/v1/CustomerProfiles/${secondary.sid}/EntityAssignments`,
        basic,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formBody({ ObjectSid: objectSid }),
        },
      );
      steps.push({
        step: `assign_${label}`,
        ok: assign.response.ok,
        objectSid,
        error: assign.response.ok ? null : assign.payload.message,
      });
    };

    await assignObject(bizUser.payload.sid as string | undefined, "business");
    await assignObject(repUser.payload.sid as string | undefined, "authorized_rep");
    await assignObject(addressDoc.payload.sid as string | undefined, "address");
    await assignObject(primarySid, "primary_profile");

    if (!profileStatusReady(secondary.status)) {
      const status = await evaluateAndSubmitCustomerProfile(basic, secondary.sid!, steps);
      secondary.status = status || secondary.status;
    }
  } else {
    steps.push({
      step: "reuse_secondary_profile",
      sid: secondary.sid,
      friendlyName: secondary.friendly_name,
      status: secondary.status,
    });
    if (!profileStatusReady(secondary.status) && (secondary.status ?? "").toLowerCase() === "draft") {
      await evaluateAndSubmitCustomerProfile(basic, secondary.sid!, steps);
      const refreshed = await twilioJson(`https://trusthub.twilio.com/v1/CustomerProfiles/${secondary.sid}`, basic);
      if (refreshed.response.ok) secondary.status = String(refreshed.payload.status ?? secondary.status);
    }
  }

  const secondarySid = secondary.sid!;
  const trusts = await listTrustProducts(basic);
  steps.push({ step: "list_trust_products", ok: trusts.ok, count: trusts.results.length, error: trusts.error });

  let trust =
    trusts.results.find((row) => isGeorgetownProfileName(row.friendly_name) && row.policy_sid === A2P_TRUST_PRODUCT_POLICY) ||
    trusts.results.find((row) => isGeorgetownProfileName(row.friendly_name)) ||
    null;

  if (!trust) {
    const createTrust = await twilioJson("https://trusthub.twilio.com/v1/TrustProducts", basic, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({
        FriendlyName: `${A2P_BRAND_FRIENDLY_NAME} A2P`,
        Email: CONTACT_EMAIL,
        PolicySid: A2P_TRUST_PRODUCT_POLICY,
      }),
    });
    steps.push({
      step: "create_trust_product",
      ok: createTrust.response.ok,
      sid: createTrust.payload.sid,
      error: createTrust.response.ok ? null : createTrust.payload.message,
    });
    if (!createTrust.response.ok || !createTrust.payload.sid) {
      return {
        ok: false,
        ready: false,
        website,
        steps,
        brand: null,
        secondaryProfileSid: secondarySid,
        trustProductSid: null,
        error: String(createTrust.payload.message || "A2P TrustProduct create failed"),
      };
    }
    trust = {
      sid: String(createTrust.payload.sid),
      friendly_name: String(createTrust.payload.friendly_name ?? ""),
      status: String(createTrust.payload.status ?? "draft"),
      policy_sid: A2P_TRUST_PRODUCT_POLICY,
    };

    const a2pUser = await twilioJson("https://trusthub.twilio.com/v1/EndUsers", basic, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({
        FriendlyName: `${A2P_BRAND_FRIENDLY_NAME} Messaging Profile`,
        Type: "us_a2p_messaging_profile_information",
        // private = non-public for-profit (matches Sole Proprietorship / LLC without stock ticker)
        Attributes: JSON.stringify({ company_type: "private", brand_contact_email: CONTACT_EMAIL }),
      }),
    });
    steps.push({
      step: "create_a2p_messaging_end_user",
      ok: a2pUser.response.ok,
      sid: a2pUser.payload.sid,
      error: a2pUser.response.ok ? null : a2pUser.payload.message,
    });

    if (a2pUser.payload.sid) {
      const assignA2p = await twilioJson(
        `https://trusthub.twilio.com/v1/TrustProducts/${trust.sid}/EntityAssignments`,
        basic,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formBody({ ObjectSid: String(a2pUser.payload.sid) }),
        },
      );
      steps.push({
        step: "assign_a2p_end_user",
        ok: assignA2p.response.ok,
        error: assignA2p.response.ok ? null : assignA2p.payload.message,
      });
    }

    const assignProfile = await twilioJson(
      `https://trusthub.twilio.com/v1/TrustProducts/${trust.sid}/EntityAssignments`,
      basic,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody({ ObjectSid: secondarySid }),
      },
    );
    steps.push({
      step: "assign_secondary_to_trust_product",
      ok: assignProfile.response.ok,
      error: assignProfile.response.ok ? null : assignProfile.payload.message,
    });

    if (!profileStatusReady(trust.status)) {
      await evaluateAndSubmitTrustProduct(basic, trust.sid!, steps);
    }
  } else {
    steps.push({
      step: "reuse_trust_product",
      sid: trust.sid,
      friendlyName: trust.friendly_name,
      status: trust.status,
    });
    if (!profileStatusReady(trust.status) && (trust.status ?? "").toLowerCase() === "draft") {
      await evaluateAndSubmitTrustProduct(basic, trust.sid!, steps);
    }
  }

  const trustSid = trust.sid!;
  const brands = await listBrandRegistrations(basic);
  steps.push({ step: "list_brands", ok: brands.ok, count: brands.data.length, error: brands.error });

  let brand =
    brands.data.find((row) => row.customer_profile_bundle_sid === secondarySid) ||
    null;

  if (!brand) {
    // Only register once Secondary + TrustProduct are at least submitted.
    const secFresh = await twilioJson(`https://trusthub.twilio.com/v1/CustomerProfiles/${secondarySid}`, basic);
    const trustFresh = await twilioJson(`https://trusthub.twilio.com/v1/TrustProducts/${trustSid}`, basic);
    const secStatus = String(secFresh.payload.status ?? secondary.status ?? "");
    const trustStatus = String(trustFresh.payload.status ?? trust.status ?? "");
    steps.push({ step: "pre_brand_status", secondaryStatus: secStatus, trustStatus });

    const createBrand = await twilioJson("https://messaging.twilio.com/v1/a2p/BrandRegistrations", basic, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({
        CustomerProfileBundleSid: secondarySid,
        A2PProfileBundleSid: trustSid,
        BrandType: "STANDARD",
      }),
    });
    steps.push({
      step: "create_brand_registration",
      ok: createBrand.response.ok,
      status: createBrand.response.status,
      sid: createBrand.payload.sid,
      brandStatus: createBrand.payload.status,
      error: createBrand.response.ok ? null : createBrand.payload.message,
    });
    if (!createBrand.response.ok || !createBrand.payload.sid) {
      return {
        ok: false,
        ready: false,
        website,
        steps,
        brand: null,
        secondaryProfileSid: secondarySid,
        trustProductSid: trustSid,
        error: String(createBrand.payload.message || "BrandRegistration create failed — Secondary/TrustProduct may still be under review"),
      };
    }
    brand = {
      sid: String(createBrand.payload.sid),
      status: String(createBrand.payload.status ?? ""),
      brand_type: String(createBrand.payload.brand_type ?? "STANDARD"),
      customer_profile_bundle_sid: secondarySid,
      a2p_profile_bundle_sid: trustSid,
    };
  } else {
    steps.push({
      step: "reuse_brand_registration",
      sid: brand.sid,
      status: brand.status,
      customerProfileBundleSid: brand.customer_profile_bundle_sid,
    });
  }

  const brandStatus = String(brand.status ?? "").toUpperCase();
  const ready = brandStatus === "APPROVED";
  return {
    ok: true,
    ready,
    website,
    steps,
    brand,
    secondaryProfileSid: secondarySid,
    trustProductSid: trustSid,
    error: ready
      ? null
      : `Georgetown Brand ${brand.sid} status is ${brand.status || "unknown"} — waiting for TCR approval before Usa2p campaign can use it.`,
  };
}

/** True when a Brand's Customer Profile is the Georgetown Secondary (not Nipsey Primary). */
export function isGeorgetownBrand(brand: BrandRow | null | undefined, secondaryProfileSid: string | null) {
  if (!brand?.sid) return false;
  if (secondaryProfileSid && brand.customer_profile_bundle_sid === secondaryProfileSid) return true;
  return false;
}
