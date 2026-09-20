import { ensureAlumniPhotoColumns } from "@/lib/alumni-photos";
import { athletePhotoSlots, primaryPhotoUrl } from "@/lib/athlete-photo-slots";
import { getDatabaseUrl, getSql, isMissingDatabaseConfig } from "@/lib/db";
import { pickLinkedinProfileUrl, type LinkedinProfileFields } from "@/lib/linkedin-profile";
import {
  classLabel,
  classifyLockerKind,
  composeAbout,
  matchesDirectoryPill,
  matchesLockerSearch,
  paginateItems,
} from "@/lib/locker-classify";
import { parseDirectoryPill } from "@/lib/locker-paths";
import { emptyLockerQa, isLockerStubId, lockerStubById, lockerStubPeople } from "@/lib/locker-stubs";
import type { DirectoryPill, LockerDirectoryResult, LockerPerson, LockerPersonDetail } from "@/lib/locker-types";

export const LOCKER_PAGE_SIZE = 24;

const PUBLIC_COLUMNS = `
  a.id,
  a.first_name,
  a.last_name,
  a.preferred_name,
  a.full_name,
  a.position,
  a.seasons,
  a.class_year,
  a.hometown_city,
  a.hometown_state,
  a.current_city,
  a.current_state,
  a.company_name,
  a.job_title,
  a.industry,
  a.linkedin_url,
  a.headline,
  a.football_photo_url,
  a.linkedin_photo_url,
  (
    SELECT MAX(r.year) FROM alumni_roster_years r WHERE r.alumni_id = a.id
  ) AS latest_roster_year,
  (
    SELECT r.class
    FROM alumni_roster_years r
    WHERE r.alumni_id = a.id
    ORDER BY r.year DESC NULLS LAST, r.id DESC
    LIMIT 1
  ) AS latest_roster_class
`;

type RosterRow = {
  id: string;
  first_name: string | null;
  last_name: string;
  preferred_name: string | null;
  full_name: string | null;
  position: string | null;
  seasons: string | null;
  class_year: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  current_city: string | null;
  current_state: string | null;
  company_name: string | null;
  job_title: string | null;
  industry: string | null;
  linkedin_url: string | null;
  headline: string | null;
  football_photo_url: string | null;
  linkedin_photo_url: string | null;
  latest_roster_year: number | null;
  latest_roster_class: string | null;
};

function cleanCell(value?: string | null) {
  const text = value?.trim() ?? "";
  if (!text || /^#(?:REF!|N\/A|VALUE!|NAME\?)$/i.test(text)) return null;
  return text;
}

function mapRosterRow(row: RosterRow): LockerPerson {
  const kind = classifyLockerKind({
    classYear: row.class_year,
    latestRosterYear: row.latest_roster_year,
    latestRosterClass: row.latest_roster_class,
  });
  const mapped: LockerPerson = {
    id: row.id,
    kind,
    firstName: cleanCell(row.first_name),
    lastName: row.last_name,
    preferredName: cleanCell(row.preferred_name),
    fullName: cleanCell(row.full_name),
    position: cleanCell(row.position),
    classYear: cleanCell(row.class_year),
    classLabel: classLabel({
      classYear: cleanCell(row.class_year),
      latestRosterClass: cleanCell(row.latest_roster_class),
      latestRosterYear: row.latest_roster_year,
    }),
    sport: "Football",
    city: cleanCell(row.current_city),
    state: cleanCell(row.current_state),
    hometownCity: cleanCell(row.hometown_city),
    hometownState: cleanCell(row.hometown_state),
    linkedinUrl: pickLinkedinProfileUrl({ linkedin_url: cleanCell(row.linkedin_url) }),
    headline: cleanCell(row.headline),
    companyName: cleanCell(row.company_name),
    jobTitle: cleanCell(row.job_title),
    industry: cleanCell(row.industry),
    seasons: cleanCell(row.seasons),
    latestRosterYear: row.latest_roster_year,
    footballPhotoUrl: cleanCell(row.football_photo_url),
    linkedinPhotoUrl: cleanCell(row.linkedin_photo_url),
    photoUrl: primaryPhotoUrl({
      football_photo_url: cleanCell(row.football_photo_url),
      linkedin_photo_url: cleanCell(row.linkedin_photo_url),
    }),
    about: null,
    source: "roster",
  };
  return {
    ...mapped,
    about: composeAbout(mapped),
  };
}

function filteredStubs(q: string, role: DirectoryPill) {
  return lockerStubPeople().filter(
    (person) => matchesLockerSearch(person, q) && matchesDirectoryPill(person.kind, role),
  );
}

function roleSql(role: DirectoryPill, year: number, index: number) {
  if (role === "athletes") {
    return {
      sql: `EXISTS (SELECT 1 FROM alumni_roster_years r WHERE r.alumni_id = a.id AND r.year >= $${index})`,
      params: [year],
    };
  }
  if (role === "alumni") {
    return {
      sql: `NOT EXISTS (SELECT 1 FROM alumni_roster_years r WHERE r.alumni_id = a.id AND r.year >= $${index})`,
      params: [year],
    };
  }
  return { sql: "", params: [] as unknown[] };
}

function searchSql(q: string, startIndex: number) {
  if (!q.trim()) return { sql: "", params: [] as unknown[] };
  return {
    sql: `(
      coalesce(a.full_name, '') ILIKE $${startIndex}
      OR coalesce(a.first_name, '') ILIKE $${startIndex}
      OR coalesce(a.last_name, '') ILIKE $${startIndex}
      OR coalesce(a.preferred_name, '') ILIKE $${startIndex}
      OR coalesce(a.position, '') ILIKE $${startIndex}
      OR coalesce(a.class_year, '') ILIKE $${startIndex}
      OR coalesce(a.current_city, '') ILIKE $${startIndex}
      OR coalesce(a.hometown_city, '') ILIKE $${startIndex}
      OR coalesce(a.current_state, '') ILIKE $${startIndex}
      OR coalesce(a.hometown_state, '') ILIKE $${startIndex}
      OR coalesce(a.company_name, '') ILIKE $${startIndex}
      OR coalesce(a.job_title, '') ILIKE $${startIndex}
    )`,
    params: [`%${q.trim()}%`],
  };
}

function buildRosterWhere(q: string, role: DirectoryPill) {
  const year = new Date().getFullYear();
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  const search = searchSql(q, i);
  if (search.sql) {
    where.push(search.sql);
    params.push(...search.params);
    i += search.params.length;
  }

  const rolePart = roleSql(role, year, i);
  if (rolePart.sql) {
    where.push(rolePart.sql);
    params.push(...rolePart.params);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

async function queryRosterPage(q: string, role: DirectoryPill, offset: number, limit: number) {
  await ensureAlumniPhotoColumns();
  const sql = getSql();
  const { whereSql, params } = buildRosterWhere(q, role);
  const countQuery = `SELECT COUNT(*)::int AS total FROM alumni a ${whereSql}`;
  const listQuery = `
    SELECT ${PUBLIC_COLUMNS}
    FROM alumni a
    ${whereSql}
    ORDER BY lower(a.last_name), lower(coalesce(a.first_name, ''))
    LIMIT ${Math.max(0, limit)} OFFSET ${Math.max(0, offset)}
  `;
  const [countRows, rows] = await Promise.all([
    sql.query(countQuery, params) as unknown as Promise<Array<{ total: number }>>,
    sql.query(listQuery, params) as unknown as Promise<RosterRow[]>,
  ]);
  return {
    rows: rows.map(mapRosterRow),
    total: countRows[0]?.total ?? 0,
  };
}

export async function searchLockerDirectory(input: {
  q?: string;
  role?: string;
  page?: number;
}): Promise<LockerDirectoryResult> {
  const q = input.q?.trim() ?? "";
  const role = parseDirectoryPill(input.role);
  const page = Math.max(1, input.page ?? 1);
  const stubs = filteredStubs(q, role);

  if (role === "coaches" || role === "staff") {
    return { ...paginateItems(stubs, page, LOCKER_PAGE_SIZE), usingSample: true };
  }

  if (!getDatabaseUrl()) {
    return { ...paginateItems(stubs, page, LOCKER_PAGE_SIZE), usingSample: true };
  }

  try {
    if (role === "athletes" || role === "alumni") {
      const roster = await queryRosterPage(q, role, (page - 1) * LOCKER_PAGE_SIZE, LOCKER_PAGE_SIZE);
      return { ...roster, page, pageSize: LOCKER_PAGE_SIZE, usingSample: false };
    }

    const start = (page - 1) * LOCKER_PAGE_SIZE;
    if (start < stubs.length) {
      const stubSlice = stubs.slice(start, start + LOCKER_PAGE_SIZE);
      const need = LOCKER_PAGE_SIZE - stubSlice.length;
      const roster = need > 0 ? await queryRosterPage(q, "all", 0, need) : { rows: [], total: 0 };
      return {
        rows: [...stubSlice, ...roster.rows],
        total: stubs.length + roster.total,
        page,
        pageSize: LOCKER_PAGE_SIZE,
        usingSample: false,
      };
    }

    const roster = await queryRosterPage(q, "all", start - stubs.length, LOCKER_PAGE_SIZE);
    return {
      rows: roster.rows,
      total: stubs.length + roster.total,
      page,
      pageSize: LOCKER_PAGE_SIZE,
      usingSample: false,
    };
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return { ...paginateItems(stubs, page, LOCKER_PAGE_SIZE), usingSample: true };
    }
    return { ...paginateItems(stubs, page, LOCKER_PAGE_SIZE), usingSample: true };
  }
}

async function queryRosterById(id: string): Promise<LockerPersonDetail | null> {
  if (!getDatabaseUrl()) return null;
  await ensureAlumniPhotoColumns();
  const sql = getSql();
  const people = (await sql.query(
    `SELECT ${PUBLIC_COLUMNS} FROM alumni a WHERE a.id = $1 LIMIT 1`,
    [id],
  )) as RosterRow[];
  const row = people[0];
  if (!row) return null;

  const person = mapRosterRow(row);
  const [rosterYears, linkedinUrl] = await Promise.all([
    sql.query(`SELECT year, position, class FROM alumni_roster_years WHERE alumni_id = $1 ORDER BY year`, [
      id,
    ]) as Promise<Array<{ year: number; position: string | null; class: string | null }>>,
    person.linkedinUrl ? Promise.resolve(person.linkedinUrl) : siblingLinkedinProfileUrl(person),
  ]);
  const resolved = { ...person, linkedinUrl };
  return {
    ...resolved,
    rosterYears,
    photos: athletePhotoSlots(resolved),
    qa: emptyLockerQa(),
  };
}

type LinkedinSiblingRow = LinkedinProfileFields & {
  id: string;
  first_name: string | null;
  last_name: string;
  preferred_name: string | null;
  full_name: string | null;
  linkedin_url: string | null;
};

async function siblingLinkedinProfileUrl(person: LockerPerson) {
  if (person.linkedinUrl || !person.lastName.trim()) return person.linkedinUrl;
  try {
    const sql = getSql();
    const result = await sql.query(
      `
      SELECT id::text AS id, first_name, last_name, preferred_name, full_name, linkedin_url
      FROM alumni
      WHERE lower(btrim(last_name)) = lower(btrim($1))
        AND id::text <> $2
        AND linkedin_url IS NOT NULL AND btrim(linkedin_url) <> ''
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 40
      `,
      [person.lastName, person.id],
    );
    const rows = Array.isArray(result)
      ? (result as LinkedinSiblingRow[])
      : ((result as { rows?: LinkedinSiblingRow[] }).rows ?? []);
    return pickLinkedinProfileUrl(person, rows);
  } catch {
    return person.linkedinUrl;
  }
}

export async function getLockerPersonById(id: string): Promise<LockerPersonDetail | null> {
  if (isLockerStubId(id)) return lockerStubById(id);
  try {
    return await queryRosterById(id);
  } catch (error) {
    if (isMissingDatabaseConfig(error)) return lockerStubById(id);
    throw error;
  }
}
