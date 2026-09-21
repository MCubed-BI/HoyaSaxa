/**
 * Athlete Overview fields on Update Me /me and claimed-self / admin profile edit.
 * About → alumni.headline; Sport → alumni.position; Location → current_city/state;
 * Emails → email_primary + alumni_emails; LinkedIn → linkedin_url.
 */
import { collectAthleteEmails } from "@/lib/athlete-emails";
import { locationLabel, parseLocationInput, positionLabel } from "@/lib/format";
import { normalizeLinkedinProfileUrl } from "@/lib/linkedin-profile";

export const OVERVIEW_COLUMN_FIELDS = [
  "first_name",
  "preferred_name",
  "email_primary",
  "phone_primary",
  "current_city",
  "current_state",
  "company_name",
  "job_title",
  "industry",
  "linkedin_url",
  "headline",
  "address_primary",
  "position",
] as const;

export type OverviewColumnField = (typeof OVERVIEW_COLUMN_FIELDS)[number];
export type OverviewColumnPatch = Partial<Record<OverviewColumnField, string | null>>;

export type OverviewFormFields = {
  about: string;
  sport: string;
  location: string;
  emails: string;
  linkedin_url: string;
};

export type OverviewInput = OverviewColumnPatch & {
  about?: string | null;
  location?: string | null;
  sport?: string | null;
  emails?: string | string[] | null;
};

const FOOTBALL = /^football$/i;

function trimToNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || null;
}

export function parseOverviewEmails(value: string | string[] | null | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  if (value === null) return [];
  const parts = (Array.isArray(value) ? value : [value]).flatMap((item) =>
    String(item)
      .split(/[\n,;]+/)
      .map((part) => part.trim())
      .filter(Boolean),
  );
  return collectAthleteEmails(null, parts);
}

export function parseOverviewSport(value?: string | null): { position: string | null } {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!text) return { position: null };
  const parts = text
    .split(/\s*[·|/]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2 && FOOTBALL.test(parts[0]!)) {
    return { position: parts.slice(1).join(" · ") };
  }
  if (parts.length === 1 && FOOTBALL.test(parts[0]!)) {
    return { position: null };
  }
  const prefixed = text.match(/^football(?:\s+|·|\/|,|\|)+(.+)$/i);
  if (prefixed?.[1]) return { position: prefixed[1].trim() };
  return { position: text };
}

export function formatOverviewSport(position?: string | null) {
  const pos = positionLabel(position);
  return pos ? `Football · ${pos}` : "Football";
}

export function formatOverviewEmails(
  primary?: string | null,
  extras: Array<{ email?: string | null } | string | null | undefined> = [],
) {
  return collectAthleteEmails(primary, extras).join("\n");
}

export function overviewFormValues(input: {
  headline?: string | null;
  about?: string | null;
  position?: string | null;
  current_city?: string | null;
  current_state?: string | null;
  email_primary?: string | null;
  emails?: Array<{ email?: string | null } | string | null | undefined>;
  linkedin_url?: string | null;
}): OverviewFormFields {
  const storedAbout = input.headline?.trim() || "";
  return {
    about: storedAbout,
    sport: formatOverviewSport(input.position),
    location: locationLabel(input.current_city, input.current_state) ?? "",
    emails: formatOverviewEmails(input.email_primary, input.emails ?? []),
    linkedin_url: input.linkedin_url?.trim() || "",
  };
}

export function normalizeOverviewLinkedin(value?: string | null) {
  const trimmed = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!trimmed) return null;
  return normalizeLinkedinProfileUrl(trimmed) ?? trimmed;
}

export function overviewInputToAlumniPatch(input: OverviewInput): {
  columns: OverviewColumnPatch;
  emails?: string[];
} {
  const columns: OverviewColumnPatch = {};

  for (const field of OVERVIEW_COLUMN_FIELDS) {
    if (field === "headline" || field === "position" || field === "current_city" || field === "current_state") {
      continue;
    }
    if (field === "email_primary" || field === "linkedin_url") continue;
    if (field in input) columns[field] = trimToNull(input[field]);
  }

  if ("about" in input) {
    columns.headline = trimToNull(input.about);
  } else if ("headline" in input) {
    columns.headline = trimToNull(input.headline);
  }

  if ("location" in input) {
    const parsed = parseLocationInput(typeof input.location === "string" ? input.location : "");
    columns.current_city = parsed.city;
    columns.current_state = parsed.state;
  } else {
    if ("current_city" in input) columns.current_city = trimToNull(input.current_city);
    if ("current_state" in input) columns.current_state = trimToNull(input.current_state);
  }

  if ("sport" in input) {
    columns.position = parseOverviewSport(typeof input.sport === "string" ? input.sport : "").position;
  } else if ("position" in input) {
    columns.position = trimToNull(input.position);
  }

  const emails = parseOverviewEmails(input.emails);
  if (emails !== undefined) {
    columns.email_primary = emails[0] ?? null;
  } else if ("email_primary" in input) {
    columns.email_primary = trimToNull(input.email_primary);
  }

  if ("linkedin_url" in input) {
    columns.linkedin_url = normalizeOverviewLinkedin(typeof input.linkedin_url === "string" ? input.linkedin_url : null);
  }

  return { columns, emails };
}

export function overviewPatchFromForm(form: {
  get(name: string): FormDataEntryValue | null;
}): OverviewInput {
  return {
    about: String(form.get("about") ?? ""),
    sport: String(form.get("sport") ?? ""),
    location: String(form.get("location") ?? ""),
    emails: String(form.get("emails") ?? ""),
    linkedin_url: String(form.get("linkedin_url") ?? ""),
  };
}
