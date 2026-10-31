export function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

export function toE164(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function displayPhone(phone: string) {
  const e164 = firstValidE164(phone) ?? toE164(phone);
  if (!e164) return phone;
  const digits = e164.slice(1);
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}

export type SmsPhoneKind = "mobile" | "home" | "work" | "unknown" | "fax";

export type SmsPhonePick = {
  phone: string;
  label: string | null;
  kind: SmsPhoneKind;
  likelyLandline: boolean;
};

/** Georgetown campus voice exchanges that rarely receive SMS. */
const CAMPUS_LANDLINE_EXCHANGES = new Set([
  "202687", // main campus
  "202784", // development / athletics office block in roster data
]);

export function classifySmsPhoneLabel(label: string | null | undefined): SmsPhoneKind {
  const value = (label ?? "").trim().toLowerCase();
  if (!value) return "unknown";
  if (/\bfax\b/.test(value)) return "fax";
  if (/\b(mobile|cell)\b/.test(value)) return "mobile";
  if (/\b(work|office|business)\b/.test(value)) return "work";
  if (/\bhome\b/.test(value)) return "home";
  return "unknown";
}

function smsPhonePriority(kind: SmsPhoneKind): number {
  switch (kind) {
    case "mobile":
      return 0;
    case "home":
      return 1;
    case "unknown":
      return 2;
    case "work":
      return 3;
    case "fax":
      return 99;
  }
}

/** Split spreadsheet leftovers like `A ::: B` into candidate phone strings. */
export function phoneFieldCandidates(raw: string): string[] {
  return raw
    .split(/\s*(?::::|,|;|\/|\band\b|\n)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** First valid E.164 from a clean or dirty phone field. */
export function firstValidE164(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = digitsOnly(raw);
  if (digits.length >= 10 && digits.length <= 15) {
    return toE164(raw);
  }
  for (const part of phoneFieldCandidates(raw)) {
    const e164 = toE164(part);
    if (e164) return e164;
  }
  return null;
}

export function isLikelyLandlineE164(e164: string, kind?: SmsPhoneKind | null): boolean {
  if (kind === "fax" || kind === "work") return true;
  const digits = digitsOnly(e164);
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length === 10 && CAMPUS_LANDLINE_EXCHANGES.has(national.slice(0, 6))) {
    return true;
  }
  return false;
}

/**
 * Prefer Mobile/Cell, then Home, then unlabeled primary, then Work.
 * Skips fax. Marks campus office exchanges and Work labels as likely landlines.
 */
export function pickSmsPhone(
  candidates: Array<{ phone: string | null | undefined; label?: string | null }>,
): SmsPhonePick | null {
  const scored: Array<{
    phone: string;
    label: string | null;
    kind: SmsPhoneKind;
    priority: number;
    landline: boolean;
  }> = [];

  for (const candidate of candidates) {
    if (!candidate.phone?.trim()) continue;
    const kind = classifySmsPhoneLabel(candidate.label);
    if (kind === "fax") continue;
    const e164 = firstValidE164(candidate.phone);
    if (!e164) continue;
    scored.push({
      phone: e164,
      label: candidate.label?.trim() || null,
      kind,
      priority: smsPhonePriority(kind),
      landline: isLikelyLandlineE164(e164, kind),
    });
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => a.priority - b.priority || a.phone.localeCompare(b.phone));

  const smsCapable = scored.find((row) => !row.landline);
  const best = smsCapable ?? scored[0]!;
  return {
    phone: best.phone,
    label: best.label,
    kind: best.kind,
    likelyLandline: best.landline,
  };
}

export function buildSmsDeepLink(phones: string[], body: string) {
  const numbers = [
    ...new Set(
      phones
        .map((phone) => firstValidE164(phone) ?? toE164(phone))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const encoded = encodeURIComponent(body);
  if (numbers.length === 0) return null;
  if (numbers.length === 1) {
    return `sms:${numbers[0]}?&body=${encoded}`;
  }
  return {
    ios: `sms:/open?addresses=${numbers.join(",")}&body=${encoded}`,
    android: `sms:${numbers.join(",")}?body=${encoded}`,
    first: `sms:${numbers[0]}?&body=${encoded}`,
  };
}
