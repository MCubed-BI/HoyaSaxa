import * as XLSX from "xlsx";

export type SourceFlags = Record<string, boolean>;

export type AlumniDraft = {
  firstName: string | null;
  lastName: string;
  preferredName: string | null;
  fullName: string | null;
  position: string | null;
  seasons: string | null;
  classYear: string | null;
  hometownCity: string | null;
  hometownState: string | null;
  currentCity: string | null;
  currentState: string | null;
  companyName: string | null;
  jobTitle: string | null;
  industry: string | null;
  linkedinUrl: string | null;
  headline: string | null;
  emailPrimary: string | null;
  phonePrimary: string | null;
  addressPrimary: string | null;
  sourceFlags: SourceFlags;
  emails: Array<{ email: string; label: string | null }>;
  phones: Array<{ phone: string; label: string | null }>;
  rosterYears: Array<{ year: number; position: string | null; className: string | null }>;
};

export type ExistingAlumni = {
  id: string;
  first_name: string | null;
  last_name: string;
  linkedin_url: string | null;
  email_primary: string | null;
  hometown_state: string | null;
  seasons: string | null;
};

export type SheetCount = {
  name: string;
  kind: SheetKind;
  rows: number;
};

export type SheetKind = "all_time" | "football" | "linkedin" | "contacts" | "roster" | "generic";

export type ParsedWorkbook = {
  drafts: AlumniDraft[];
  sheetCounts: SheetCount[];
  warnings: string[];
};

export type PreviewSample = {
  name: string;
  email: string | null;
  linkedinUrl: string | null;
  action: "update" | "insert";
  matchBy: "linkedin" | "email" | "name" | null;
};

export type MatchPlan = {
  toInsert: AlumniDraft[];
  toUpdate: Array<{ draft: AlumniDraft; id: string; matchBy: PreviewSample["matchBy"] }>;
};

export type ApplyResult = {
  inserted: number;
  updated: number;
  emails: number;
  phones: number;
  rosterYears: number;
};

export type SqlClient = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

export const MAX_IMPORT_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_IMPORT_DRAFTS = 12_000;
export const APPLY_BATCH_SIZE = 200;

const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);

export function clean(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value)
    .replace(/\u2060/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text === "0" || text === "-" || text === "⁠" || text.toLowerCase() === "n/a") {
    return null;
  }
  return text;
}

export function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitName(fullName: string) {
  const parts = fullName.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return { firstName: null as string | null, lastName: parts[0]! };
  }
  const last = parts[parts.length - 1]!;
  if (parts.length >= 3 && SUFFIXES.has(last.toLowerCase())) {
    return {
      firstName: parts.slice(0, -2).join(" "),
      lastName: parts.slice(-2).join(" "),
    };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: last,
  };
}

export function nameKey(lastName: string, firstName: string | null) {
  return `${normalizeName(lastName)}|${normalizeName(firstName ?? "")}`;
}

export function parseSeasons(raw: unknown): number[] {
  if (raw == null || raw === "") return [];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return [Math.round(raw)];
  }
  const parts = String(raw)
    .split(/[,;/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const years: number[] = [];
  let century = 1900;
  for (const part of parts) {
    const digits = part.replace(/\D/g, "");
    if (!digits) continue;
    const n = Number.parseInt(digits, 10);
    if (n >= 1800 && n <= 2100) {
      century = Math.floor(n / 100) * 100;
      years.push(n);
    } else if (n >= 0 && n <= 99) {
      let year = century + n;
      const prev = years[years.length - 1];
      if (prev != null && year < prev) {
        year += 100;
        century += 100;
      }
      years.push(year);
    }
  }
  return [...new Set(years)].sort((a, b) => a - b);
}

export function formatSeasons(years: number[]) {
  if (years.length === 0) return null;
  if (years.length === 1) return String(years[0]);
  return years.join(",");
}

export function parseYearGrad(raw: unknown): string | null {
  const text = clean(raw);
  if (!text) return null;
  const apostrophe = text.match(/'(\d{2})/);
  if (apostrophe) {
    const two = Number.parseInt(apostrophe[1]!, 10);
    return String(two <= 35 ? 2000 + two : 1900 + two);
  }
  const four = text.match(/(?:19|20)\d{2}/);
  return four?.[0] ?? text;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function normalizeEmail(value: unknown) {
  const text = clean(value)?.toLowerCase();
  return text && isEmail(text) ? text : null;
}

export function normalizePhone(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const digits = String(Math.round(value));
    return digits.length >= 10 ? digits : null;
  }
  const text = clean(value);
  if (!text || !isPhone(text)) return null;
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeLinkedin(value: unknown) {
  const text = clean(value);
  if (!text || !text.includes("linkedin.com")) return null;
  return text.startsWith("http") ? text : `https://${text}`;
}

export function emptyDraft(lastName: string): AlumniDraft {
  return {
    firstName: null,
    lastName,
    preferredName: null,
    fullName: null,
    position: null,
    seasons: null,
    classYear: null,
    hometownCity: null,
    hometownState: null,
    currentCity: null,
    currentState: null,
    companyName: null,
    jobTitle: null,
    industry: null,
    linkedinUrl: null,
    headline: null,
    emailPrimary: null,
    phonePrimary: null,
    addressPrimary: null,
    sourceFlags: {},
    emails: [],
    phones: [],
    rosterYears: [],
  };
}

function assign(target: AlumniDraft, patch: Partial<AlumniDraft>) {
  for (const [key, value] of Object.entries(patch) as Array<[keyof AlumniDraft, AlumniDraft[keyof AlumniDraft]]>) {
    if (key === "sourceFlags" || key === "emails" || key === "phones" || key === "rosterYears") continue;
    if (value == null || value === "") continue;
    if (target[key] == null || target[key] === "") {
      (target as Record<string, unknown>)[key] = value;
    }
  }
}

function addEmail(draft: AlumniDraft, email: string | null, label: string | null) {
  if (!email) return;
  if (!draft.emails.some((item) => item.email === email)) {
    draft.emails.push({ email, label });
  }
  if (!draft.emailPrimary) draft.emailPrimary = email;
}

function addPhone(draft: AlumniDraft, phone: string | null, label: string | null) {
  if (!phone) return;
  if (!draft.phones.some((item) => item.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""))) {
    draft.phones.push({ phone, label });
  }
  if (!draft.phonePrimary) draft.phonePrimary = phone;
}

function addRosterYear(draft: AlumniDraft, year: number, position: string | null, className: string | null) {
  const existing = draft.rosterYears.find((row) => row.year === year);
  if (existing) {
    existing.position ||= position;
    existing.className ||= className;
    return;
  }
  draft.rosterYears.push({ year, position, className });
}

function sheetToRows(workbook: XLSX.WorkBook, name: string) {
  return XLSX.utils.sheet_to_json<(string | number | null)[]>(workbook.Sheets[name]!, {
    header: 1,
    raw: true,
    defval: null,
  });
}

function headerBlob(row: Array<string | number | null> | undefined) {
  return (row ?? [])
    .map((cell) => String(cell ?? "").trim().toLowerCase())
    .join(" | ");
}

function detectSheetKind(sheetName: string, rows: Array<Array<string | number | null>>): SheetKind | null {
  const name = sheetName.toLowerCase();
  if (name.includes("all time")) return "all_time";
  if (name.includes("linkedin")) return "linkedin";
  if (name.includes("football")) return "football";
  if (name.includes("2011") || name.includes("roster")) return "roster";
  if (name.includes("sgarlata") || name.includes("contact")) return "contacts";

  const header = headerBlob(rows[0]);
  if (!header) return null;
  if (header.includes("seasons") && (header.includes("home town") || header.includes("hometown"))) {
    return "all_time";
  }
  if (header.includes("linkedin") && header.includes("first name")) return "linkedin";
  if (header.includes("preferred name") && header.includes("year grad")) return "football";
  if (header.includes("year") && header.includes("pos") && header.includes("class")) return "roster";
  if (header.includes("first name") && header.includes("last name") && (header.includes("phone") || header.includes("e-mail") || header.includes("email"))) {
    return "contacts";
  }
  if (header.includes("first") && header.includes("last")) return "generic";
  if (header.includes("name")) return "all_time";
  return null;
}

function findDraft(map: Map<string, AlumniDraft[]>, lastName: string, firstName: string | null) {
  const key = nameKey(lastName, firstName);
  const matches = map.get(key);
  if (matches?.length === 1) return matches[0]!;
  if (matches && matches.length > 1) return matches[0]!;
  if (firstName) {
    const firstToken = firstName.split(" ")[0] ?? firstName;
    const loose = [...map.values()]
      .flat()
      .filter(
        (draft) =>
          normalizeName(draft.lastName) === normalizeName(lastName) &&
          normalizeName(draft.firstName ?? "").startsWith(normalizeName(firstToken)),
      );
    if (loose.length === 1) return loose[0]!;
  }
  return null;
}

function remember(map: Map<string, AlumniDraft[]>, draft: AlumniDraft) {
  const key = nameKey(draft.lastName, draft.firstName);
  const list = map.get(key) ?? [];
  if (!list.includes(draft)) list.push(draft);
  map.set(key, list);
}

function getOrCreate(
  drafts: AlumniDraft[],
  byName: Map<string, AlumniDraft[]>,
  lastName: string,
  firstName: string | null,
  fullName: string | null,
) {
  let draft = findDraft(byName, lastName, firstName);
  if (!draft) {
    draft = emptyDraft(lastName);
    draft.firstName = firstName;
    draft.fullName = fullName ?? [firstName, lastName].filter(Boolean).join(" ");
    drafts.push(draft);
    remember(byName, draft);
  }
  return draft;
}

function countDataRows(kind: SheetKind, rows: Array<Array<string | number | null>>) {
  if (kind === "all_time") {
    return rows.filter((row) => {
      const name = clean(row[0]);
      return Boolean(name && name !== "Name" && !/^-[A-Z]-$/.test(name));
    }).length;
  }
  return Math.max(0, rows.length - 1);
}

function parseAllTime(
  rows: Array<Array<string | number | null>>,
  drafts: AlumniDraft[],
  byName: Map<string, AlumniDraft[]>,
) {
  let parsed = 0;
  for (const row of rows) {
    const name = clean(row[0]);
    if (!name || name === "Name" || /^-[A-Z]-$/.test(name)) continue;
    const { firstName, lastName } = splitName(name);
    const years = parseSeasons(row[1]);
    const draft = emptyDraft(lastName);
    draft.firstName = firstName;
    draft.fullName = name;
    draft.position = clean(row[2]);
    draft.seasons = formatSeasons(years) ?? clean(row[1]);
    draft.hometownCity = clean(row[3]);
    draft.hometownState = clean(row[4]);
    draft.sourceFlags.all_time = true;
    for (const year of years) addRosterYear(draft, year, draft.position, null);
    drafts.push(draft);
    remember(byName, draft);
    parsed += 1;
  }
  return parsed;
}

function parseFootball(
  rows: Array<Array<string | number | null>>,
  drafts: AlumniDraft[],
  byName: Map<string, AlumniDraft[]>,
) {
  let parsed = 0;
  for (const row of rows.slice(1)) {
    const firstName = clean(row[1]);
    const lastName = clean(row[2]);
    if (!lastName) continue;
    const draft = getOrCreate(drafts, byName, lastName, firstName, [firstName, lastName].filter(Boolean).join(" "));
    assign(draft, {
      preferredName: clean(row[0]),
      firstName,
      classYear: parseYearGrad(row[3]),
    });
    addEmail(draft, normalizeEmail(row[5]), "alumni");
    draft.sourceFlags.football = true;
    parsed += 1;
  }
  return parsed;
}

function parseLinkedin(
  rows: Array<Array<string | number | null>>,
  drafts: AlumniDraft[],
  byName: Map<string, AlumniDraft[]>,
  createIfMissing: boolean,
) {
  let parsed = 0;
  for (const row of rows.slice(1)) {
    const firstName = clean(row[2]);
    const lastName = clean(row[3]);
    if (!lastName) continue;
    let draft = findDraft(byName, lastName, firstName);
    if (!draft && createIfMissing) {
      draft = getOrCreate(drafts, byName, lastName, firstName, clean(row[1]));
    }
    if (!draft) continue;
    assign(draft, {
      firstName,
      currentCity: clean(row[11]),
      currentState: clean(row[12]),
      companyName: clean(row[8]),
      jobTitle: clean(row[7]),
      industry: clean(row[6]) || clean(row[34]),
      linkedinUrl: normalizeLinkedin(row[13]),
      headline: clean(row[29]),
    });
    addEmail(draft, normalizeEmail(row[4]), "linkedin");
    draft.sourceFlags.linkedin = true;
    parsed += 1;
  }
  return parsed;
}

function parseContacts(
  rows: Array<Array<string | number | null>>,
  drafts: AlumniDraft[],
  byName: Map<string, AlumniDraft[]>,
) {
  let parsed = 0;
  for (const row of rows.slice(1)) {
    const firstName = clean(row[0]);
    const lastName = clean(row[1]);
    if (!lastName) continue;
    const draft = getOrCreate(drafts, byName, lastName, firstName, [firstName, lastName].filter(Boolean).join(" "));
    for (const cell of row) {
      const email = normalizeEmail(cell);
      if (email) addEmail(draft, email, "contact");
      const phone = normalizePhone(cell);
      if (phone) addPhone(draft, phone, "contact");
    }
    assign(draft, {
      addressPrimary: clean(row[23]),
      currentCity: draft.currentCity ?? clean(row[25]),
      currentState: draft.currentState ?? clean(row[27]),
    });
    draft.sourceFlags.contacts = true;
    parsed += 1;
  }
  return parsed;
}

function parseRoster(
  rows: Array<Array<string | number | null>>,
  drafts: AlumniDraft[],
  byName: Map<string, AlumniDraft[]>,
) {
  let parsed = 0;
  for (const row of rows.slice(1)) {
    for (let i = 0; i + 3 < row.length; i += 4) {
      const yearRaw = row[i];
      const year =
        typeof yearRaw === "number"
          ? Math.round(yearRaw)
          : Number.parseInt(String(yearRaw ?? "").replace(/\D/g, ""), 10);
      const name = clean(row[i + 1]);
      if (!name || !Number.isFinite(year) || year < 1990) continue;
      const { firstName, lastName } = splitName(name);
      const draft = getOrCreate(drafts, byName, lastName, firstName, name);
      const position = clean(row[i + 2]);
      const className = clean(row[i + 3]);
      addRosterYear(draft, year, position, className);
      assign(draft, { position, fullName: name });
      const years = parseSeasons(draft.seasons);
      if (!years.includes(year)) {
        years.push(year);
        years.sort((a, b) => a - b);
        draft.seasons = formatSeasons(years);
      }
      draft.sourceFlags.roster_2011_2025 = true;
      parsed += 1;
    }
  }
  return parsed;
}

function colIndex(header: Array<string | number | null> | undefined, aliases: string[]) {
  const cells = (header ?? []).map((cell) => String(cell ?? "").trim().toLowerCase());
  for (const alias of aliases) {
    const hit = cells.findIndex((cell) => cell === alias || cell.includes(alias));
    if (hit >= 0) return hit;
  }
  return -1;
}

function parseGeneric(
  rows: Array<Array<string | number | null>>,
  drafts: AlumniDraft[],
  byName: Map<string, AlumniDraft[]>,
) {
  const header = rows[0];
  const firstIdx = colIndex(header, ["first name", "first"]);
  const lastIdx = colIndex(header, ["last name", "last"]);
  const nameIdx = colIndex(header, ["full name", "name"]);
  const emailIdx = colIndex(header, ["email"]);
  const phoneIdx = colIndex(header, ["phone", "mobile"]);
  const linkedinIdx = colIndex(header, ["linkedin"]);
  const companyIdx = colIndex(header, ["company"]);
  const titleIdx = colIndex(header, ["title", "position", "job"]);
  const cityIdx = colIndex(header, ["city"]);
  const stateIdx = colIndex(header, ["state"]);
  const classIdx = colIndex(header, ["class year", "year grad", "class"]);
  const seasonsIdx = colIndex(header, ["seasons", "years"]);
  let parsed = 0;
  for (const row of rows.slice(1)) {
    let firstName = firstIdx >= 0 ? clean(row[firstIdx]) : null;
    let lastName = lastIdx >= 0 ? clean(row[lastIdx]) : null;
    if (!lastName && nameIdx >= 0) {
      const name = clean(row[nameIdx]);
      if (name) {
        const split = splitName(name);
        firstName = firstName ?? split.firstName;
        lastName = split.lastName;
      }
    }
    if (!lastName) continue;
    const draft = getOrCreate(drafts, byName, lastName, firstName, [firstName, lastName].filter(Boolean).join(" "));
    assign(draft, {
      firstName,
      companyName: companyIdx >= 0 ? clean(row[companyIdx]) : null,
      jobTitle: titleIdx >= 0 ? clean(row[titleIdx]) : null,
      currentCity: cityIdx >= 0 ? clean(row[cityIdx]) : null,
      currentState: stateIdx >= 0 ? clean(row[stateIdx]) : null,
      classYear: classIdx >= 0 ? parseYearGrad(row[classIdx]) : null,
      seasons: seasonsIdx >= 0 ? clean(row[seasonsIdx]) : null,
      linkedinUrl: linkedinIdx >= 0 ? normalizeLinkedin(row[linkedinIdx]) : null,
    });
    if (emailIdx >= 0) addEmail(draft, normalizeEmail(row[emailIdx]), "csv");
    if (phoneIdx >= 0) addPhone(draft, normalizePhone(row[phoneIdx]), "csv");
    draft.sourceFlags.generic = true;
    parsed += 1;
  }
  return parsed;
}

export function parseAlumniWorkbook(workbook: XLSX.WorkBook): ParsedWorkbook {
  const drafts: AlumniDraft[] = [];
  const byName = new Map<string, AlumniDraft[]>();
  const sheetCounts: SheetCount[] = [];
  const warnings: string[] = [];

  const planned = workbook.SheetNames.map((name) => {
    const rows = sheetToRows(workbook, name);
    return { name, rows, kind: detectSheetKind(name, rows) };
  });

  const recognized = planned.filter((sheet) => sheet.kind);
  if (recognized.length === 0) {
    return {
      drafts,
      sheetCounts,
      warnings: ["No recognizable alumni sheets. Use the coach workbook or a CSV with name columns."],
    };
  }

  const hasCoreSheet = recognized.some((sheet) => sheet.kind && sheet.kind !== "linkedin");
  const createFromLinkedin = !hasCoreSheet;

  const order: SheetKind[] = ["all_time", "football", "linkedin", "contacts", "roster", "generic"];
  for (const kind of order) {
    for (const sheet of recognized) {
      if (sheet.kind !== kind) continue;
      let parsed = 0;
      if (kind === "all_time") parsed = parseAllTime(sheet.rows, drafts, byName);
      if (kind === "football") parsed = parseFootball(sheet.rows, drafts, byName);
      if (kind === "linkedin") parsed = parseLinkedin(sheet.rows, drafts, byName, createFromLinkedin);
      if (kind === "contacts") parsed = parseContacts(sheet.rows, drafts, byName);
      if (kind === "roster") parsed = parseRoster(sheet.rows, drafts, byName);
      if (kind === "generic") parsed = parseGeneric(sheet.rows, drafts, byName);
      sheetCounts.push({
        name: sheet.name,
        kind,
        rows: parsed || countDataRows(kind, sheet.rows),
      });
    }
  }

  if (createFromLinkedin) {
    warnings.push("LinkedIn-only file: rows were created from that sheet instead of matching All Time first.");
  }

  return { drafts, sheetCounts, warnings };
}

export function readAlumniWorkbook(bytes: Buffer, filename: string): ParsedWorkbook {
  const workbook = XLSX.read(bytes, { type: "buffer", cellDates: false, dense: false });
  if (workbook.SheetNames.length === 0) {
    return { drafts: [], sheetCounts: [], warnings: [`${filename} has no sheets.`] };
  }
  return parseAlumniWorkbook(workbook);
}

export function draftDisplayName(draft: AlumniDraft) {
  return draft.fullName || [draft.preferredName || draft.firstName, draft.lastName].filter(Boolean).join(" ");
}

export function buildMatchLookups(existing: ExistingAlumni[]) {
  const existingByName = new Map<string, ExistingAlumni[]>();
  const existingByEmail = new Map<string, ExistingAlumni>();
  const existingByLinkedin = new Map<string, ExistingAlumni>();
  for (const row of existing) {
    const key = nameKey(row.last_name, row.first_name);
    existingByName.set(key, [...(existingByName.get(key) ?? []), row]);
    if (row.email_primary) existingByEmail.set(row.email_primary.toLowerCase(), row);
    if (row.linkedin_url) existingByLinkedin.set(row.linkedin_url.toLowerCase(), row);
  }

  function matchExisting(draft: AlumniDraft): { row: ExistingAlumni; matchBy: PreviewSample["matchBy"] } | null {
    if (draft.linkedinUrl) {
      const hit = existingByLinkedin.get(draft.linkedinUrl.toLowerCase());
      if (hit) return { row: hit, matchBy: "linkedin" };
    }
    if (draft.emailPrimary) {
      const hit = existingByEmail.get(draft.emailPrimary);
      if (hit) return { row: hit, matchBy: "email" };
    }
    const matches = existingByName.get(nameKey(draft.lastName, draft.firstName)) ?? [];
    if (matches.length === 1) return { row: matches[0]!, matchBy: "name" };
    if (matches.length > 1 && draft.hometownState) {
      const hometown = matches.find(
        (row) => row.hometown_state?.toLowerCase() === draft.hometownState?.toLowerCase(),
      );
      if (hometown) return { row: hometown, matchBy: "name" };
    }
    return null;
  }

  return { matchExisting };
}

export function planDraftMatches(existing: ExistingAlumni[], drafts: AlumniDraft[]): MatchPlan {
  const { matchExisting } = buildMatchLookups(existing);
  const toInsert: AlumniDraft[] = [];
  const toUpdate: MatchPlan["toUpdate"] = [];
  for (const draft of drafts) {
    const current = matchExisting(draft);
    if (current) toUpdate.push({ draft, id: current.row.id, matchBy: current.matchBy });
    else toInsert.push(draft);
  }
  return { toInsert, toUpdate };
}

export function buildPreviewSamples(plan: MatchPlan, limit = 8): PreviewSample[] {
  const updates = plan.toUpdate.slice(0, limit).map(({ draft, matchBy }) => ({
    name: draftDisplayName(draft),
    email: draft.emailPrimary,
    linkedinUrl: draft.linkedinUrl,
    action: "update" as const,
    matchBy,
  }));
  const inserts = plan.toInsert.slice(0, limit).map((draft) => ({
    name: draftDisplayName(draft),
    email: draft.emailPrimary,
    linkedinUrl: draft.linkedinUrl,
    action: "insert" as const,
    matchBy: null,
  }));
  return [...updates, ...inserts];
}

export async function loadExistingAlumni(sql: SqlClient): Promise<ExistingAlumni[]> {
  const rows = (await sql.query(
    `SELECT id, first_name, last_name, linkedin_url, email_primary, hometown_state, seasons
     FROM alumni`,
  )) as ExistingAlumni[];
  return rows;
}

async function insertAlumni(sql: SqlClient, batch: AlumniDraft[]) {
  const params: unknown[] = [];
  const values = batch.map((draft, index) => {
    const o = index * 20;
    params.push(
      draft.firstName,
      draft.lastName,
      draft.preferredName,
      draft.fullName,
      draft.position,
      draft.seasons,
      draft.classYear,
      draft.hometownCity,
      draft.hometownState,
      draft.currentCity,
      draft.currentState,
      draft.companyName,
      draft.jobTitle,
      draft.industry,
      draft.linkedinUrl,
      draft.headline,
      draft.emailPrimary,
      draft.phonePrimary,
      draft.addressPrimary,
      JSON.stringify(draft.sourceFlags),
    );
    return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9},$${o + 10},$${o + 11},$${o + 12},$${o + 13},$${o + 14},$${o + 15},$${o + 16},$${o + 17},$${o + 18},$${o + 19},$${o + 20}::jsonb)`;
  });
  const rows = (await sql.query(
    `INSERT INTO alumni (
      first_name, last_name, preferred_name, full_name, position, seasons, class_year,
      hometown_city, hometown_state, current_city, current_state, company_name, job_title,
      industry, linkedin_url, headline, email_primary, phone_primary, address_primary, source_flags
    ) VALUES ${values.join(",")}
    RETURNING id`,
    params,
  )) as Array<{ id: string }>;
  return rows;
}

async function updateAlumni(sql: SqlClient, items: Array<{ draft: AlumniDraft; id: string }>) {
  await Promise.all(
    items.map(({ draft, id }) =>
      sql.query(
        `UPDATE alumni SET
          first_name = COALESCE($1, first_name),
          preferred_name = COALESCE($2, preferred_name),
          full_name = COALESCE($3, full_name),
          position = COALESCE($4, position),
          seasons = COALESCE($5, seasons),
          class_year = COALESCE($6, class_year),
          hometown_city = COALESCE($7, hometown_city),
          hometown_state = COALESCE($8, hometown_state),
          current_city = COALESCE($9, current_city),
          current_state = COALESCE($10, current_state),
          company_name = COALESCE($11, company_name),
          job_title = COALESCE($12, job_title),
          industry = COALESCE($13, industry),
          linkedin_url = COALESCE($14, linkedin_url),
          headline = COALESCE($15, headline),
          email_primary = COALESCE($16, email_primary),
          phone_primary = COALESCE($17, phone_primary),
          address_primary = COALESCE($18, address_primary),
          source_flags = COALESCE(source_flags, '{}'::jsonb) || $19::jsonb,
          updated_at = now()
        WHERE id = $20`,
        [
          draft.firstName,
          draft.preferredName,
          draft.fullName,
          draft.position,
          draft.seasons,
          draft.classYear,
          draft.hometownCity,
          draft.hometownState,
          draft.currentCity,
          draft.currentState,
          draft.companyName,
          draft.jobTitle,
          draft.industry,
          draft.linkedinUrl,
          draft.headline,
          draft.emailPrimary,
          draft.phonePrimary,
          draft.addressPrimary,
          JSON.stringify(draft.sourceFlags),
          id,
        ],
      ),
    ),
  );
}

async function writeRelated(
  sql: SqlClient,
  drafts: AlumniDraft[],
  idByDraft: Map<AlumniDraft, string>,
): Promise<{ emails: number; phones: number; rosterYears: number }> {
  const emails: Array<[string, string, string | null]> = [];
  const phones: Array<[string, string, string | null]> = [];
  const roster: Array<[string, number, string | null, string | null]> = [];
  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();
  const seenRoster = new Set<string>();
  for (const draft of drafts) {
    const id = idByDraft.get(draft);
    if (!id) continue;
    for (const email of draft.emails) {
      const key = `${id}|${email.email}`;
      if (seenEmail.has(key)) continue;
      seenEmail.add(key);
      emails.push([id, email.email, email.label]);
    }
    for (const phone of draft.phones) {
      const key = `${id}|${phone.phone.replace(/\D/g, "")}`;
      if (seenPhone.has(key)) continue;
      seenPhone.add(key);
      phones.push([id, phone.phone, phone.label]);
    }
    for (const season of draft.rosterYears) {
      const key = `${id}|${season.year}`;
      if (seenRoster.has(key)) continue;
      seenRoster.add(key);
      roster.push([id, season.year, season.position, season.className]);
    }
  }

  for (let i = 0; i < emails.length; i += 80) {
    const batch = emails.slice(i, i + 80);
    const params: unknown[] = [];
    const values = batch.map((row, index) => {
      const o = index * 3;
      params.push(...row);
      return `($${o + 1}::uuid,$${o + 2},$${o + 3})`;
    });
    await sql.query(
      `INSERT INTO alumni_emails (alumni_id, email, label)
       SELECT alumni_id, email, label
       FROM (VALUES ${values.join(",")}) AS v(alumni_id, email, label)
       ON CONFLICT (alumni_id, lower(email)) DO UPDATE
       SET label = COALESCE(EXCLUDED.label, alumni_emails.label)`,
      params,
    );
  }

  for (let i = 0; i < phones.length; i += 80) {
    const batch = phones.slice(i, i + 80);
    const params: unknown[] = [];
    const values = batch.map((row, index) => {
      const o = index * 3;
      params.push(...row);
      return `($${o + 1}::uuid,$${o + 2},$${o + 3})`;
    });
    await sql.query(
      `INSERT INTO alumni_phones (alumni_id, phone, label)
       SELECT v.alumni_id, v.phone, v.label
       FROM (VALUES ${values.join(",")}) AS v(alumni_id, phone, label)
       WHERE NOT EXISTS (
         SELECT 1 FROM alumni_phones p
         WHERE p.alumni_id = v.alumni_id
           AND regexp_replace(p.phone, '\\D', '', 'g') = regexp_replace(v.phone, '\\D', '', 'g')
       )`,
      params,
    );
  }

  for (let i = 0; i < roster.length; i += 80) {
    const batch = roster.slice(i, i + 80);
    const params: unknown[] = [];
    const values = batch.map((row, index) => {
      const o = index * 4;
      params.push(...row);
      return `($${o + 1}::uuid,$${o + 2}::int,$${o + 3},$${o + 4})`;
    });
    await sql.query(
      `INSERT INTO alumni_roster_years (alumni_id, year, position, class)
       VALUES ${values.join(",")}
       ON CONFLICT (alumni_id, year) DO UPDATE SET
         position = COALESCE(EXCLUDED.position, alumni_roster_years.position),
         class = COALESCE(EXCLUDED.class, alumni_roster_years.class)`,
      params,
    );
  }

  return { emails: emails.length, phones: phones.length, rosterYears: roster.length };
}

export type StagedRow = {
  draft: AlumniDraft;
  existingId: string | null;
};

export function planToStagedRows(plan: MatchPlan): StagedRow[] {
  return [
    ...plan.toUpdate.map(({ draft, id }) => ({ draft, existingId: id })),
    ...plan.toInsert.map((draft) => ({ draft, existingId: null })),
  ];
}

export function stagedRowsFromPayload(payload: unknown): StagedRow[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { draft?: AlumniDraft; existingId?: string | null; lastName?: string };
      if (row.draft && typeof row.draft === "object" && row.draft.lastName) {
        return {
          draft: row.draft,
          existingId: typeof row.existingId === "string" ? row.existingId : null,
        };
      }
      if (typeof row.lastName === "string") {
        return { draft: item as AlumniDraft, existingId: null };
      }
      return null;
    })
    .filter((row): row is StagedRow => Boolean(row));
}

export async function applyStagedRows(sql: SqlClient, rows: StagedRow[]): Promise<ApplyResult> {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, emails: 0, phones: 0, rosterYears: 0 };
  }

  const toInsert = rows.filter((row) => !row.existingId).map((row) => row.draft);
  const toUpdate = rows
    .filter((row): row is StagedRow & { existingId: string } => Boolean(row.existingId))
    .map((row) => ({ draft: row.draft, id: row.existingId }));
  const drafts = rows.map((row) => row.draft);
  const idByDraft = new Map<AlumniDraft, string>();
  for (const item of toUpdate) idByDraft.set(item.draft, item.id);

  for (let i = 0; i < toInsert.length; i += 40) {
    const batch = toInsert.slice(i, i + 40);
    const inserted = await insertAlumni(sql, batch);
    inserted.forEach((row, index) => {
      idByDraft.set(batch[index]!, row.id);
    });
  }

  for (let i = 0; i < toUpdate.length; i += 25) {
    await updateAlumni(sql, toUpdate.slice(i, i + 25));
  }

  const related = await writeRelated(sql, drafts, idByDraft);
  return {
    inserted: toInsert.length,
    updated: toUpdate.length,
    emails: related.emails,
    phones: related.phones,
    rosterYears: related.rosterYears,
  };
}

export async function applyDrafts(sql: SqlClient, drafts: AlumniDraft[]): Promise<ApplyResult> {
  if (drafts.length === 0) {
    return { inserted: 0, updated: 0, emails: 0, phones: 0, rosterYears: 0 };
  }

  const existing = await loadExistingAlumni(sql);
  return applyStagedRows(sql, planToStagedRows(planDraftMatches(existing, drafts)));
}

export function contactCounts(drafts: AlumniDraft[]) {
  return {
    emails: drafts.reduce((sum, draft) => sum + draft.emails.length, 0),
    phones: drafts.reduce((sum, draft) => sum + draft.phones.length, 0),
    rosterYears: drafts.reduce((sum, draft) => sum + draft.rosterYears.length, 0),
  };
}
