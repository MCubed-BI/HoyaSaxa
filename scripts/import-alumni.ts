import { existsSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import * as XLSX from "xlsx";

config({ path: ".env.local" });
config();

type SourceFlags = Record<string, boolean>;

type Draft = {
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

type Existing = {
  id: string;
  first_name: string | null;
  last_name: string;
  linkedin_url: string | null;
  email_primary: string | null;
  hometown_state: string | null;
  seasons: string | null;
};

const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function clean(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value)
    .replace(/\u2060/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text === "0" || text === "-" || text.toLowerCase() === "n/a") return null;
  return text;
}

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitName(fullName: string) {
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

function nameKey(lastName: string, firstName: string | null) {
  return `${normalizeName(lastName)}|${normalizeName(firstName ?? "")}`;
}

function parseSeasons(raw: unknown): number[] {
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

function formatSeasons(years: number[]) {
  if (years.length === 0) return null;
  if (years.length === 1) return String(years[0]);
  return years.join(",");
}

function parseYearGrad(raw: unknown): string | null {
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

function normalizeEmail(value: unknown) {
  const text = clean(value)?.toLowerCase();
  return text && isEmail(text) ? text : null;
}

function normalizePhone(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const digits = String(Math.round(value));
    return digits.length >= 10 ? digits : null;
  }
  const text = clean(value);
  if (!text || !isPhone(text)) return null;
  return text.replace(/\s+/g, " ").trim();
}

function normalizeLinkedin(value: unknown) {
  const text = clean(value);
  if (!text || !text.includes("linkedin.com")) return null;
  return text.startsWith("http") ? text : `https://${text}`;
}

function emptyDraft(lastName: string): Draft {
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

function assign(target: Draft, patch: Partial<Draft>) {
  for (const [key, value] of Object.entries(patch) as Array<[keyof Draft, Draft[keyof Draft]]>) {
    if (key === "sourceFlags" || key === "emails" || key === "phones" || key === "rosterYears") continue;
    if (value == null || value === "") continue;
    if (target[key] == null || target[key] === "") {
      (target as Record<string, unknown>)[key] = value;
    }
  }
}

function addEmail(draft: Draft, email: string | null, label: string | null) {
  if (!email) return;
  if (!draft.emails.some((item) => item.email === email)) {
    draft.emails.push({ email, label });
  }
  if (!draft.emailPrimary) draft.emailPrimary = email;
}

function addPhone(draft: Draft, phone: string | null, label: string | null) {
  if (!phone) return;
  if (!draft.phones.some((item) => item.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""))) {
    draft.phones.push({ phone, label });
  }
  if (!draft.phonePrimary) draft.phonePrimary = phone;
}

function addRosterYear(draft: Draft, year: number, position: string | null, className: string | null) {
  const existing = draft.rosterYears.find((row) => row.year === year);
  if (existing) {
    existing.position ||= position;
    existing.className ||= className;
    return;
  }
  draft.rosterYears.push({ year, position, className });
}

function sheetByHint(workbook: XLSX.WorkBook, hint: string) {
  const name = workbook.SheetNames.find((sheet) => sheet.toLowerCase().includes(hint));
  if (!name) return [];
  return XLSX.utils.sheet_to_json<(string | number | null)[]>(workbook.Sheets[name]!, {
    header: 1,
    raw: true,
    defval: null,
  });
}

function resolveFilePath() {
  const fromArg = argValue("--file");
  const candidates = [
    fromArg,
    "uploads/georgetown-alumni_5545.xlsx",
    "data/georgetown-alumni.xlsx",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (existsSync(resolved)) return resolved;
  }
  throw new Error(
    "No workbook found. Pass --file path/to/georgetown-alumni.xlsx (the coach workbook is not committed).",
  );
}

function findDraft(map: Map<string, Draft[]>, lastName: string, firstName: string | null) {
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

function remember(map: Map<string, Draft[]>, draft: Draft) {
  const key = nameKey(draft.lastName, draft.firstName);
  const list = map.get(key) ?? [];
  if (!list.includes(draft)) list.push(draft);
  map.set(key, list);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add the Neon URL.");
  }

  const filePath = resolveFilePath();
  console.log(`Reading ${filePath}`);
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const drafts: Draft[] = [];
  const byName = new Map<string, Draft[]>();

  const allTime = sheetByHint(workbook, "all time");
  for (const row of allTime) {
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
  }

  const football = sheetByHint(workbook, "football");
  for (const row of football.slice(1)) {
    const firstName = clean(row[1]);
    const lastName = clean(row[2]);
    if (!lastName) continue;
    let draft = findDraft(byName, lastName, firstName);
    if (!draft) {
      draft = emptyDraft(lastName);
      draft.firstName = firstName;
      draft.fullName = [firstName, lastName].filter(Boolean).join(" ");
      drafts.push(draft);
      remember(byName, draft);
    }
    assign(draft, {
      preferredName: clean(row[0]),
      firstName,
      classYear: parseYearGrad(row[3]),
    });
    addEmail(draft, normalizeEmail(row[5]), "alumni");
    draft.sourceFlags.football = true;
  }

  const linkedin = sheetByHint(workbook, "linkedin");
  for (const row of linkedin.slice(1)) {
    const firstName = clean(row[2]);
    const lastName = clean(row[3]);
    if (!lastName) continue;
    const draft = findDraft(byName, lastName, firstName);
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
  }

  const contacts = sheetByHint(workbook, "sgarlata");
  for (const row of contacts.slice(1)) {
    const firstName = clean(row[0]);
    const lastName = clean(row[1]);
    if (!lastName) continue;
    let draft = findDraft(byName, lastName, firstName);
    if (!draft) {
      draft = emptyDraft(lastName);
      draft.firstName = firstName;
      draft.fullName = [firstName, lastName].filter(Boolean).join(" ");
      drafts.push(draft);
      remember(byName, draft);
    }
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
  }

  const rosters = sheetByHint(workbook, "2011");
  for (const row of rosters.slice(1)) {
    for (let i = 0; i + 3 < row.length; i += 4) {
      const yearRaw = row[i];
      const year =
        typeof yearRaw === "number"
          ? Math.round(yearRaw)
          : Number.parseInt(String(yearRaw ?? "").replace(/\D/g, ""), 10);
      const name = clean(row[i + 1]);
      if (!name || !Number.isFinite(year) || year < 1990) continue;
      const { firstName, lastName } = splitName(name);
      let draft = findDraft(byName, lastName, firstName);
      if (!draft) {
        draft = emptyDraft(lastName);
        draft.firstName = firstName;
        draft.fullName = name;
        drafts.push(draft);
        remember(byName, draft);
      }
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
    }
  }

  console.log(`Prepared ${drafts.length} alumni records`);

  const sql = neon(databaseUrl);
  const existing = (await sql`
    SELECT id, first_name, last_name, linkedin_url, email_primary, hometown_state, seasons
    FROM alumni
  `) as Existing[];

  const existingByName = new Map<string, Existing[]>();
  const existingByEmail = new Map<string, Existing>();
  const existingByLinkedin = new Map<string, Existing>();
  for (const row of existing) {
    const key = nameKey(row.last_name, row.first_name);
    existingByName.set(key, [...(existingByName.get(key) ?? []), row]);
    if (row.email_primary) existingByEmail.set(row.email_primary.toLowerCase(), row);
    if (row.linkedin_url) existingByLinkedin.set(row.linkedin_url.toLowerCase(), row);
  }

  function matchExisting(draft: Draft) {
    if (draft.linkedinUrl) {
      const hit = existingByLinkedin.get(draft.linkedinUrl.toLowerCase());
      if (hit) return hit;
    }
    if (draft.emailPrimary) {
      const hit = existingByEmail.get(draft.emailPrimary);
      if (hit) return hit;
    }
    const matches = existingByName.get(nameKey(draft.lastName, draft.firstName)) ?? [];
    if (matches.length === 1) return matches[0]!;
    if (matches.length > 1 && draft.hometownState) {
      const hometown = matches.find(
        (row) => row.hometown_state?.toLowerCase() === draft.hometownState?.toLowerCase(),
      );
      if (hometown) return hometown;
    }
    return null;
  }

  const toInsert: Draft[] = [];
  const toUpdate: Array<{ draft: Draft; id: string }> = [];
  for (const draft of drafts) {
    const current = matchExisting(draft);
    if (current) toUpdate.push({ draft, id: current.id });
    else toInsert.push(draft);
  }

  const idByDraft = new Map<Draft, string>();
  for (const item of toUpdate) idByDraft.set(item.draft, item.id);

  for (let i = 0; i < toInsert.length; i += 40) {
    const batch = toInsert.slice(i, i + 40);
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
      RETURNING id, last_name, first_name`,
      params,
    )) as Array<{ id: string; last_name: string; first_name: string | null }>;

    rows.forEach((row, index) => {
      const draft = batch[index]!;
      idByDraft.set(draft, row.id);
    });
    console.log(`Inserted ${Math.min(i + batch.length, toInsert.length)} / ${toInsert.length}`);
  }

  for (let i = 0; i < toUpdate.length; i += 25) {
    const batch = toUpdate.slice(i, i + 25);
    await Promise.all(
      batch.map(({ draft, id }) =>
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
    console.log(`Updated ${Math.min(i + batch.length, toUpdate.length)} / ${toUpdate.length}`);
  }

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

  console.log(
    `Done. Inserted ${toInsert.length}, updated ${toUpdate.length}, emails ${emails.length}, phones ${phones.length}, roster years ${roster.length}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
