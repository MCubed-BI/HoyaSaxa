/**
 * Athlete Overview fields on Update Me /me and claimed-self / admin profile edit.
 * About → alumni.headline; Sport → alumni.position; Location → current_city/state;
 * Emails → email_primary + alumni_emails; LinkedIn → linkedin_url.
 * Admins may also patch roster identity (last name, class year, hometown, seasons).
 */
import { parseClassYearInput } from "@/lib/alumni-class-year";
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

/** Staff-only roster columns — applied only when an admin saves a profile. */
export const ADMIN_ROSTER_COLUMN_FIELDS = [
  "last_name",
  "full_name",
  "class_year",
  "seasons",
  "hometown_city",
  "hometown_state",
] as const;

export const PROFILE_CONTACT_FORM_FIELDS = [
  "first_name",
  "preferred_name",
  "phone_primary",
  "company_name",
  "job_title",
  "industry",
  "address_primary",
] as const;

export type OverviewColumnField = (typeof OVERVIEW_COLUMN_FIELDS)[number];
export type AdminRosterColumnField = (typeof ADMIN_ROSTER_COLUMN_FIELDS)[number];
export type ProfileColumnField = OverviewColumnField | AdminRosterColumnField;
export type OverviewColumnPatch = Partial<Record<OverviewColumnField, string | null>>;
export type AdminRosterColumnPatch = Partial<Record<AdminRosterColumnField, string | null>>;
export type ProfileColumnPatch = OverviewColumnPatch & AdminRosterColumnPatch;

export type OverviewFormFields = {
  about: string;
  sport: string;
  location: string;
  emails: string;
  linkedin_url: string;
};

export type ProfileContactFormFields = {
  first_name: string;
  preferred_name: string;
  phone_primary: string;
  company_name: string;
  job_title: string;
  industry: string;
  address_primary: string;
};

export type AdminRosterFormFields = {
  last_name: string;
  full_name: string;
  class_year: string;
  seasons: string;
  hometown: string;
};

export type OverviewInput = OverviewColumnPatch &
  AdminRosterColumnPatch & {
    about?: string | null;
    location?: string | null;
    sport?: string | null;
    emails?: string | string[] | null;
    hometown?: string | null;
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

export function overviewInputToAlumniPatch(
  input: OverviewInput,
  options: { includeAdminRoster?: boolean } = {},
): {
  columns: ProfileColumnPatch;
  emails?: string[];
} {
  const columns: ProfileColumnPatch = {};

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

  if (options.includeAdminRoster) {
    for (const field of ADMIN_ROSTER_COLUMN_FIELDS) {
      if (field === "hometown_city" || field === "hometown_state" || field === "class_year") continue;
      if (field in input) columns[field] = trimToNull(input[field]);
    }

    if ("hometown" in input) {
      const parsed = parseLocationInput(typeof input.hometown === "string" ? input.hometown : "");
      columns.hometown_city = parsed.city;
      columns.hometown_state = parsed.state;
    } else {
      if ("hometown_city" in input) columns.hometown_city = trimToNull(input.hometown_city);
      if ("hometown_state" in input) columns.hometown_state = trimToNull(input.hometown_state);
    }

    if ("class_year" in input) {
      const raw = trimToNull(input.class_year);
      columns.class_year = raw ? parseClassYearInput(raw) ?? raw : null;
    }
  }

  return { columns, emails };
}

export function profileContactFormValues(input: {
  first_name?: string | null;
  preferred_name?: string | null;
  phone_primary?: string | null;
  company_name?: string | null;
  job_title?: string | null;
  industry?: string | null;
  address_primary?: string | null;
}): ProfileContactFormFields {
  return {
    first_name: input.first_name?.trim() || "",
    preferred_name: input.preferred_name?.trim() || "",
    phone_primary: input.phone_primary?.trim() || "",
    company_name: input.company_name?.trim() || "",
    job_title: input.job_title?.trim() || "",
    industry: input.industry?.trim() || "",
    address_primary: input.address_primary?.trim() || "",
  };
}

export function adminRosterFormValues(input: {
  last_name?: string | null;
  full_name?: string | null;
  class_year?: string | null;
  seasons?: string | null;
  hometown_city?: string | null;
  hometown_state?: string | null;
}): AdminRosterFormFields {
  return {
    last_name: input.last_name?.trim() || "",
    full_name: input.full_name?.trim() || "",
    class_year: input.class_year?.trim() || "",
    seasons: input.seasons?.trim() || "",
    hometown: locationLabel(input.hometown_city, input.hometown_state) ?? "",
  };
}

function readOptionalFormField(
  form: { get(name: string): FormDataEntryValue | null },
  name: string,
): string | undefined {
  const value = form.get(name);
  if (value === null) return undefined;
  return String(value);
}

export function overviewPatchFromForm(form: {
  get(name: string): FormDataEntryValue | null;
}): OverviewInput {
  const patch: OverviewInput = {
    about: String(form.get("about") ?? ""),
    sport: String(form.get("sport") ?? ""),
    location: String(form.get("location") ?? ""),
    emails: String(form.get("emails") ?? ""),
    linkedin_url: String(form.get("linkedin_url") ?? ""),
  };

  for (const field of PROFILE_CONTACT_FORM_FIELDS) {
    const value = readOptionalFormField(form, field);
    if (value !== undefined) patch[field] = value;
  }

  for (const field of ["last_name", "full_name", "class_year", "seasons"] as const) {
    const value = readOptionalFormField(form, field);
    if (value !== undefined) patch[field] = value;
  }

  const hometown = readOptionalFormField(form, "hometown");
  if (hometown !== undefined) patch.hometown = hometown;

  return patch;
}
