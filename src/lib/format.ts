import { parseClassYearInput } from "@/lib/alumni-class-year";
import type { AlumniListItem } from "@/lib/types";

const HONORIFIC = /^(mr|mrs|ms|miss|dr|prof|rev|sir|hon)\.?$/i;
const EMPTY_CELL = /^(#(?:ref!|n\/a|value!|name\?)|n\/a|null|undefined|-|—|\.)$/i;
const ACADEMIC_CLASS =
  /^(?:r[-\s]?)?(fr|so|jr|sr|gr|freshman|sophomore|junior|senior|graduate)\.?$/i;
const COUNTRY_TOKENS = new Set(["us", "usa", "u.s", "u.s.a", "united states", "united states of america", "america"]);

const STATE_ABBR: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  "washington dc": "DC",
  "washington d.c.": "DC",
  "d.c.": "DC",
  dc: "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "puerto rico": "PR",
};

const US_STATE_CODES = new Set(Object.values(STATE_ABBR));

export function cleanDisplay(value?: string | null) {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!text || EMPTY_CELL.test(text)) return null;
  return text;
}

function lettersOf(value: string) {
  return value.replace(/[^A-Za-z]/g, "");
}

function needsDisplayCase(value: string) {
  const letters = lettersOf(value);
  if (!letters) return false;
  return letters === letters.toUpperCase() || letters === letters.toLowerCase();
}

function titleCaseWords(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s/'()-])([a-z])/g, (_, edge: string, letter: string) => edge + letter.toUpperCase())
    .replace(/\bMc([a-z])/g, (_, letter: string) => `Mc${letter.toUpperCase()}`);
}

export function displayPersonName(value?: string | null) {
  const text = cleanDisplay(value);
  if (!text) return null;
  return needsDisplayCase(text) ? titleCaseWords(text) : text;
}

function stripHonorifics(name: string) {
  return name
    .split(/\s+/)
    .filter((part) => !HONORIFIC.test(part))
    .join(" ")
    .trim();
}

export function displayName(person: Pick<AlumniListItem, "preferred_name" | "first_name" | "last_name" | "full_name">) {
  const last = displayPersonName(person.last_name);
  const first = displayPersonName(person.first_name);
  const preferredRaw = displayPersonName(person.preferred_name);
  const preferred = preferredRaw ? stripHonorifics(preferredRaw) : "";
  const full = displayPersonName(person.full_name);
  if (preferred && last && !preferred.toLowerCase().includes(last.toLowerCase())) {
    return `${preferred} ${last}`;
  }
  if (full) return full;
  return [first, last].filter(Boolean).join(" ") || preferred || "Unknown";
}

function stateCode(value?: string | null) {
  const text = cleanDisplay(value);
  if (!text) return null;
  const compact = text.replace(/\./g, "").trim();
  const upper = compact.toUpperCase();
  if (compact.length === 2 && US_STATE_CODES.has(upper)) return upper;
  return STATE_ABBR[compact.toLowerCase()] ?? null;
}

function parsePackedPlace(value: string): { city: string | null; state: string | null } {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  while (parts.length && COUNTRY_TOKENS.has(parts[parts.length - 1]!.replace(/\./g, "").toLowerCase())) {
    parts.pop();
  }
  if (parts.length === 0) return { city: null, state: null };
  if (parts.length === 1) {
    const only = parts[0]!;
    const words = only.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const code = stateCode(words[words.length - 1]);
      if (code) {
        const city = displayPersonName(words.slice(0, -1).join(" "));
        return { city, state: code };
      }
    }
    const code = stateCode(only);
    return code ? { city: null, state: code } : { city: displayPersonName(only), state: null };
  }
  const last = parts[parts.length - 1]!;
  const code = stateCode(last);
  if (code) {
    const city = displayPersonName(parts.slice(0, -1).join(", "));
    return { city, state: code };
  }
  return { city: displayPersonName(parts[0]!), state: null };
}

/** Parse a typed place such as "New York, NY" or "New York NY". */
export function parseLocationInput(value?: string | null): { city: string | null; state: string | null } {
  const text = cleanDisplay(value);
  if (!text) return { city: null, state: null };
  return parsePackedPlace(text);
}

export function locationLabel(city?: string | null, state?: string | null) {
  const cityClean = cleanDisplay(city);
  const stateClean = cleanDisplay(state);
  let parsedCity: string | null = null;
  let parsedState: string | null = null;

  if (cityClean?.includes(",")) {
    const packed = parsePackedPlace(cityClean);
    parsedCity = packed.city;
    parsedState = packed.state;
  } else if (cityClean) {
    const asState = cityClean.length <= 3 ? stateCode(cityClean) : null;
    parsedCity = asState && !stateClean ? null : displayPersonName(cityClean);
    if (asState && !stateClean) parsedState = asState;
  }

  if (stateClean?.includes(",")) {
    const packed = parsePackedPlace(stateClean);
    parsedCity = parsedCity ?? packed.city;
    parsedState = parsedState ?? packed.state;
  } else if (stateClean) {
    parsedState = parsedState ?? stateCode(stateClean);
    if (!parsedState && !parsedCity) {
      const packed = parsePackedPlace(stateClean);
      parsedCity = packed.city;
      parsedState = packed.state;
    }
  }

  if (parsedCity && parsedState && parsedCity.toUpperCase() === parsedState) {
    parsedCity = null;
  }

  return [parsedCity, parsedState].filter(Boolean).join(", ") || null;
}

export function residenceLabel(person: {
  current_city?: string | null;
  current_state?: string | null;
  hometown_city?: string | null;
  hometown_state?: string | null;
}) {
  return (
    locationLabel(person.current_city, person.current_state) ||
    locationLabel(person.hometown_city, person.hometown_state)
  );
}

export function positionLabel(value?: string | null) {
  const text = cleanDisplay(value);
  if (!text) return null;
  return text
    .split(/\s*[/|,]\s*/)
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return null;
      const compact = lettersOf(trimmed);
      if (compact && compact.length <= 4 && !/\s/.test(trimmed)) {
        return trimmed.replace(/[A-Za-z]+/g, (chunk) => chunk.toUpperCase());
      }
      return needsDisplayCase(trimmed) ? titleCaseWords(trimmed) : trimmed;
    })
    .filter(Boolean)
    .join(" / ");
}

export function classYearLabel(value?: string | null) {
  const text = cleanDisplay(value);
  if (!text) return null;
  if (ACADEMIC_CLASS.test(text)) {
    const token = text.replace(/\./g, "").trim().toLowerCase();
    const short: Record<string, string> = {
      fr: "Fr.",
      freshman: "Fr.",
      so: "So.",
      sophomore: "So.",
      jr: "Jr.",
      junior: "Jr.",
      sr: "Sr.",
      senior: "Sr.",
      gr: "Gr.",
      graduate: "Gr.",
    };
    return short[token] ?? text;
  }
  const year = parseClassYearInput(text);
  return year ? `Class of ${year}` : null;
}

export function jobLabel(company?: string | null, title?: string | null) {
  const companyText = cleanDisplay(company);
  const titleText = cleanDisplay(title);
  if (companyText && titleText) return `${titleText}, ${companyText}`;
  return titleText || companyText || null;
}

export function initials(person: Pick<AlumniListItem, "preferred_name" | "first_name" | "last_name" | "full_name">) {
  const name = displayName(person);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const APP_LOCALE = "en-US";
export const APP_TIMEZONE = "America/New_York";

export function parseDate(value: Date | string | number | null | undefined) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateParts(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(APP_LOCALE, { timeZone: APP_TIMEZONE, ...options }).format(date);
}

export function formatDate(value: Date | string | number | null | undefined) {
  const date = parseDate(value);
  if (!date) return null;
  return dateParts(date, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(value: Date | string | number | null | undefined) {
  const date = parseDate(value);
  if (!date) return null;
  const day = dateParts(date, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const time = dateParts(date, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time} ET`;
}

export function formatRelativeTime(
  value: Date | string | number | null | undefined,
  now: Date | number = Date.now(),
) {
  const date = parseDate(value);
  if (!date) return null;
  const nowMs = now instanceof Date ? now.getTime() : now;
  const deltaSec = Math.round((date.getTime() - nowMs) / 1000);
  const abs = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat(APP_LOCALE, { numeric: "auto" });
  if (abs < 45) return rtf.format(0, "second");
  if (abs < 90) return rtf.format(deltaSec < 0 ? -1 : 1, "minute");
  if (abs < 3600) return rtf.format(Math.trunc(deltaSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.trunc(deltaSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.trunc(deltaSec / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.trunc(deltaSec / 2_592_000), "month");
  return rtf.format(Math.trunc(deltaSec / 31_536_000), "year");
}

export function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(APP_LOCALE).format(value);
}

export function formatCurrency(cents: number) {
  const dollars = cents / 100;
  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(dollars);
}

export function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

export function resultRange(page: number, pageSize: number, total: number) {
  if (total <= 0) return { start: 0, end: 0, label: "0 results" };
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return {
    start,
    end,
    label: `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(total)}`,
  };
}

export function pageWindow(page: number, pageCount: number, radius = 2) {
  if (pageCount <= 0) return [] as Array<number | "ellipsis">;
  const current = Math.min(Math.max(1, page), pageCount);
  const pages = new Set<number>([1, pageCount]);
  for (let i = current - radius; i <= current + radius; i++) {
    if (i >= 1 && i <= pageCount) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  for (const item of sorted) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && item - prev > 1) out.push("ellipsis");
    out.push(item);
  }
  return out;
}
