import { getSql } from "@/lib/db";
import {
  expandAlumniFilters,
  PAGE_SIZE,
  buildAlumniWhere,
  emptyFilters,
  type AlumniFilterAliases,
  type AlumniFilters,
} from "@/lib/filters";
import {
  groupFilterOptions,
  normalizeFilterCity,
  normalizeFilterClassYear,
  normalizeFilterPosition,
  normalizeFilterState,
} from "@/lib/filter-normalize";
import type { AlumniLocationRow } from "@/lib/geocode";
import type {
  AlumniDetail,
  AlumniEmail,
  AlumniFacets,
  AlumniListItem,
  AlumniPhone,
  AlumniRosterYear,
  BlastRecipient,
  ContactExportRow,
  DirectoryResult,
} from "@/lib/types";

const LIST_COLUMNS = `
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
  a.email_primary,
  a.phone_primary,
  a.address_primary
`;

function asRawList(rows: Record<string, unknown>[], key: string) {
  return rows
    .map((row) => (typeof row[key] === "string" ? row[key] : null))
    .filter((value): value is string => Boolean(value && value.trim()));
}

type AlumniFacetIndex = {
  facets: AlumniFacets;
  aliases: AlumniFilterAliases;
};

async function loadRawFacetRows() {
  const sql = getSql();
  return Promise.all([
    sql`SELECT DISTINCT current_state AS value FROM alumni WHERE current_state IS NOT NULL AND btrim(current_state) <> ''
        UNION
        SELECT DISTINCT hometown_state AS value FROM alumni WHERE hometown_state IS NOT NULL AND btrim(hometown_state) <> ''
        ORDER BY 1`,
    sql`SELECT DISTINCT current_city AS value FROM alumni WHERE current_city IS NOT NULL AND btrim(current_city) <> ''
        UNION
        SELECT DISTINCT hometown_city AS value FROM alumni WHERE hometown_city IS NOT NULL AND btrim(hometown_city) <> ''
        ORDER BY 1
        LIMIT 400`,
    sql`SELECT DISTINCT position AS value FROM alumni WHERE position IS NOT NULL AND btrim(position) <> ''
        UNION
        SELECT DISTINCT position AS value FROM alumni_roster_years WHERE position IS NOT NULL AND btrim(position) <> ''
        ORDER BY 1`,
    sql`SELECT DISTINCT class_year AS value FROM alumni WHERE class_year IS NOT NULL AND btrim(class_year) <> '' ORDER BY 1 DESC`,
    sql`SELECT DISTINCT year::text AS value FROM alumni_roster_years ORDER BY 1 DESC`,
  ]);
}

async function loadFacetIndex(): Promise<AlumniFacetIndex> {
  const [states, cities, positions, classYears, seasonYears] = await loadRawFacetRows();
  const groupedStates = groupFilterOptions(asRawList(states as Record<string, unknown>[], "value"), normalizeFilterState);
  const groupedCities = groupFilterOptions(asRawList(cities as Record<string, unknown>[], "value"), normalizeFilterCity);
  const groupedPositions = groupFilterOptions(
    asRawList(positions as Record<string, unknown>[], "value"),
    normalizeFilterPosition,
  );
  const groupedClassYears = groupFilterOptions(
    asRawList(classYears as Record<string, unknown>[], "value"),
    normalizeFilterClassYear,
    "desc",
  );
  const seasons = [...new Set(asRawList(seasonYears as Record<string, unknown>[], "value"))].sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }),
  );

  return {
    facets: {
      states: groupedStates.options,
      cities: groupedCities.options,
      positions: groupedPositions.options,
      classYears: groupedClassYears.options,
      seasonYears: seasons,
    },
    aliases: {
      states: groupedStates.aliases,
      cities: groupedCities.aliases,
      positions: groupedPositions.aliases,
      classYears: groupedClassYears.aliases,
    },
  };
}

async function filtersForQuery(filters: AlumniFilters): Promise<AlumniFilters> {
  const index = await loadFacetIndex();
  return expandAlumniFilters(filters, index.aliases);
}

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  const rows = await sql.query(text, params);
  return rows as unknown as T;
}

export async function getAlumniFacets(): Promise<AlumniFacets> {
  return (await loadFacetIndex()).facets;
}

export async function searchAlumni(filters: AlumniFilters, page: number): Promise<DirectoryResult> {
  const index = await loadFacetIndex();
  const { whereSql, params } = buildAlumniWhere(expandAlumniFilters(filters, index.aliases));
  const offset = (page - 1) * PAGE_SIZE;

  const countQuery = `SELECT COUNT(*)::int AS total FROM alumni a ${whereSql}`;
  const listQuery = `
    SELECT ${LIST_COLUMNS}
    FROM alumni a
    ${whereSql}
    ORDER BY lower(a.last_name), lower(coalesce(a.first_name, ''))
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;

  const [countRows, rows] = await Promise.all([
    query<Array<{ total: number }>>(countQuery, params),
    query<AlumniListItem[]>(listQuery, params),
  ]);

  return {
    rows,
    total: countRows[0]?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
    facets: index.facets,
  };
}

export async function searchAlumniByName(q: string, limit = 8): Promise<AlumniListItem[]> {
  const needle = q.trim();
  if (needle.length < 1) return [];
  const cap = Math.max(1, Math.min(limit, 12));
  return query<AlumniListItem[]>(
    `
    SELECT ${LIST_COLUMNS}
    FROM alumni a
    WHERE
      coalesce(a.full_name, '') ILIKE $1
      OR coalesce(a.first_name, '') ILIKE $1
      OR coalesce(a.last_name, '') ILIKE $1
      OR coalesce(a.preferred_name, '') ILIKE $1
    ORDER BY
      CASE
        WHEN lower(coalesce(a.last_name, '')) = lower($2) THEN 0
        WHEN lower(coalesce(a.preferred_name, '')) = lower($2) THEN 1
        WHEN lower(coalesce(a.first_name, '')) = lower($2) THEN 2
        WHEN lower(coalesce(a.last_name, '')) LIKE lower($2) || '%' THEN 3
        WHEN lower(coalesce(a.preferred_name, '')) LIKE lower($2) || '%' THEN 4
        ELSE 5
      END,
      lower(a.last_name),
      lower(coalesce(a.first_name, ''))
    LIMIT ${cap}
    `,
    [`%${needle}%`, needle],
  );
}

export async function getAlumniLocationRows(filters: AlumniFilters): Promise<AlumniLocationRow[]> {
  const { whereSql, params } = buildAlumniWhere(await filtersForQuery(filters));
  return query<AlumniLocationRow[]>(
    `
    SELECT
      a.id,
      a.first_name,
      a.last_name,
      a.preferred_name,
      a.full_name,
      a.position,
      a.class_year,
      a.hometown_city,
      a.hometown_state,
      a.current_city,
      a.current_state,
      a.address_primary
    FROM alumni a
    ${whereSql}
    ORDER BY lower(a.last_name), lower(coalesce(a.first_name, ''))
    `,
    params,
  );
}

export async function getAlumniCount(filters: AlumniFilters) {
  const { whereSql, params } = buildAlumniWhere(await filtersForQuery(filters));
  const rows = await query<Array<{ total: number }>>(`SELECT COUNT(*)::int AS total FROM alumni a ${whereSql}`, params);
  return rows[0]?.total ?? 0;
}

export async function getAlumniById(id: string): Promise<AlumniDetail | null> {
  const people = await query<Array<AlumniDetail>>(
    `SELECT ${LIST_COLUMNS}, a.source_flags, a.created_at, a.updated_at
     FROM alumni a
     WHERE a.id = $1
     LIMIT 1`,
    [id],
  );

  const person = people[0];
  if (!person) return null;

  const [emails, phones, rosterYears] = await Promise.all([
    query<AlumniEmail[]>(`SELECT id, alumni_id, email, label FROM alumni_emails WHERE alumni_id = $1 ORDER BY id`, [id]),
    query<AlumniPhone[]>(`SELECT id, alumni_id, phone, label FROM alumni_phones WHERE alumni_id = $1 ORDER BY id`, [id]),
    query<AlumniRosterYear[]>(
      `SELECT id, alumni_id, year, position, class FROM alumni_roster_years WHERE alumni_id = $1 ORDER BY year`,
      [id],
    ),
  ]);

  return {
    ...person,
    emails,
    phones,
    roster_years: rosterYears,
  };
}

export async function getReportSummary(filters: AlumniFilters) {
  const { whereSql, params } = buildAlumniWhere(await filtersForQuery(filters));
  const rows = await query<
    Array<{ alumni: number; emails: number; phones: number }>
  >(
    `
    SELECT
      COUNT(*)::int AS alumni,
      COALESCE(SUM(CASE WHEN (
        (a.email_primary IS NOT NULL AND btrim(a.email_primary) <> '')
        OR EXISTS (SELECT 1 FROM alumni_emails e WHERE e.alumni_id = a.id)
      ) THEN 1 ELSE 0 END), 0)::int AS emails,
      COALESCE(SUM(CASE WHEN (
        (a.phone_primary IS NOT NULL AND btrim(a.phone_primary) <> '')
        OR EXISTS (SELECT 1 FROM alumni_phones p WHERE p.alumni_id = a.id)
      ) THEN 1 ELSE 0 END), 0)::int AS phones
    FROM alumni a
    ${whereSql}
    `,
    params,
  );
  return rows[0] ?? { alumni: 0, emails: 0, phones: 0 };
}

export async function getContactExportRows(filters: AlumniFilters, limit?: number): Promise<ContactExportRow[]> {
  const { whereSql, params } = buildAlumniWhere(await filtersForQuery(filters));
  const rows = await query<ContactExportRow[]>(
    `
    SELECT
      a.id,
      COALESCE(NULLIF(btrim(a.full_name), ''), NULLIF(btrim(concat_ws(' ', a.preferred_name, a.last_name)), ''), NULLIF(btrim(concat_ws(' ', a.first_name, a.last_name)), ''), a.last_name) AS name,
      a.position,
      a.class_year,
      a.current_city,
      a.current_state,
      a.company_name,
      a.job_title,
      a.linkedin_url,
      COALESCE((
        SELECT array_agg(DISTINCT email)
        FROM (
          SELECT a.email_primary AS email
          WHERE a.email_primary IS NOT NULL AND btrim(a.email_primary) <> ''
          UNION
          SELECT e.email FROM alumni_emails e WHERE e.alumni_id = a.id
        ) emails
      ), ARRAY[]::text[]) AS emails,
      COALESCE((
        SELECT array_agg(DISTINCT phone)
        FROM (
          SELECT a.phone_primary AS phone
          WHERE a.phone_primary IS NOT NULL AND btrim(a.phone_primary) <> ''
          UNION
          SELECT p.phone FROM alumni_phones p WHERE p.alumni_id = a.id
        ) phones
      ), ARRAY[]::text[]) AS phones
    FROM alumni a
    ${whereSql}
    ORDER BY lower(a.last_name), lower(coalesce(a.first_name, ''))
    ${limit ? `LIMIT ${Math.max(1, Math.min(limit, 200))}` : ""}
    `,
    params,
  );

  return rows;
}

export type RecipientQuery = {
  filters: AlumniFilters;
  ids?: string[];
  includeFilters?: boolean;
  includeIds?: boolean;
};

async function recipientWhere(input: RecipientQuery) {
  const ids = [...new Set((input.ids ?? []).filter(Boolean))];
  const includeIds = Boolean(input.includeIds && ids.length);
  const includeFilters = Boolean(input.includeFilters);
  if (!includeFilters && !includeIds) {
    return { whereSql: "WHERE FALSE", params: [] as unknown[] };
  }
  if (includeIds && !includeFilters) {
    return buildAlumniWhere(emptyFilters(), 1, { ids, idsOnly: true });
  }
  const filters = await filtersForQuery(input.filters);
  if (includeIds && includeFilters) {
    return buildAlumniWhere(filters, 1, { ids });
  }
  return buildAlumniWhere(filters);
}

export async function getAlumniIds(input: RecipientQuery) {
  const { whereSql, params } = await recipientWhere(input);
  const rows = await query<Array<{ id: string }>>(`SELECT a.id FROM alumni a ${whereSql}`, params);
  return rows.map((row) => row.id);
}

export async function getBlastRecipients(input: RecipientQuery): Promise<BlastRecipient[]> {
  const { whereSql, params } = await recipientWhere(input);
  return query<BlastRecipient[]>(
    `
    SELECT
      a.id,
      COALESCE(NULLIF(btrim(a.full_name), ''), NULLIF(btrim(concat_ws(' ', a.first_name, a.last_name)), ''), a.last_name) AS name,
      COALESCE(
        NULLIF(btrim(a.phone_primary), ''),
        (SELECT p.phone FROM alumni_phones p WHERE p.alumni_id = a.id ORDER BY p.id LIMIT 1)
      ) AS phone,
      COALESCE(
        NULLIF(btrim(a.email_primary), ''),
        (SELECT e.email FROM alumni_emails e WHERE e.alumni_id = a.id ORDER BY e.id LIMIT 1)
      ) AS email
    FROM alumni a
    ${whereSql}
    ORDER BY lower(a.last_name), lower(coalesce(a.first_name, ''))
    `,
    params,
  );
}
