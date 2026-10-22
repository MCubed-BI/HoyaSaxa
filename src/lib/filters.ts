import {
  expandFilterSelection,
  normalizeFilterCity,
  normalizeFilterClassYear,
  normalizeFilterPosition,
  normalizeFilterState,
  uniqueCanonicalValues,
  type FilterAliasMap,
} from "@/lib/filter-normalize";
import { parsePersonKinds, PERSON_KIND_LABELS, type PersonKind } from "@/lib/person-kind";

export type AlumniFilters = {
  q: string;
  states: string[];
  cities: string[];
  positions: string[];
  classYears: string[];
  seasonYears: string[];
  /** Industry / career labels (searchable multi-select). */
  careers: string[];
  /** Alum (player) and/or Support — empty means both. */
  personKinds: PersonKind[];
  hasEmail: boolean;
  hasPhone: boolean;
  hasLinkedin: boolean;
  /** Claimed / registered Hoyas only (alumni_claims). */
  registered: boolean;
};

export type AlumniFilterAliases = {
  states: FilterAliasMap;
  cities: FilterAliasMap;
  positions: FilterAliasMap;
  classYears: FilterAliasMap;
};

export const PAGE_SIZE = 40;

function asList(value: string | string[] | undefined) {
  const items = Array.isArray(value) ? value : value != null ? [value] : [];
  const out: string[] = [];
  for (const item of items) {
    for (const part of String(item).split(",")) {
      const trimmed = part.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return [...new Set(out)];
}

function first(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function flag(searchParams: Record<string, string | string[] | undefined>, ...keys: string[]) {
  return keys.some((key) => {
    const value = first(searchParams, key).toLowerCase();
    return value === "1" || value === "true" || value === "on" || value === "yes";
  });
}

export function searchParamsToRecord(params: URLSearchParams) {
  const record: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    record[key] = all.length > 1 ? all : (all[0] ?? "");
  }
  return record;
}

export function canonicalizeAlumniFilters(filters: AlumniFilters): AlumniFilters {
  return {
    ...filters,
    q: filters.q.trim(),
    states: uniqueCanonicalValues(filters.states, normalizeFilterState),
    cities: uniqueCanonicalValues(filters.cities, normalizeFilterCity),
    positions: uniqueCanonicalValues(filters.positions, normalizeFilterPosition),
    classYears: uniqueCanonicalValues(filters.classYears, normalizeFilterClassYear),
    seasonYears: [...new Set(filters.seasonYears.map((value) => value.trim()).filter(Boolean))],
    careers: [...new Set(filters.careers.map((value) => value.trim()).filter(Boolean))],
    personKinds: parsePersonKinds(filters.personKinds ?? []),
    registered: Boolean(filters.registered),
  };
}

export function expandAlumniFilters(filters: AlumniFilters, aliases: AlumniFilterAliases): AlumniFilters {
  const canonical = canonicalizeAlumniFilters(filters);
  return {
    ...canonical,
    states: expandFilterSelection(canonical.states, aliases.states, normalizeFilterState),
    cities: expandFilterSelection(canonical.cities, aliases.cities, normalizeFilterCity),
    positions: expandFilterSelection(canonical.positions, aliases.positions, normalizeFilterPosition),
    classYears: expandFilterSelection(canonical.classYears, aliases.classYears, normalizeFilterClassYear),
  };
}

export function parseAlumniFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AlumniFilters {
  return canonicalizeAlumniFilters({
    q: first(searchParams, "q"),
    states: asList(searchParams.state ?? searchParams.states),
    cities: asList(searchParams.city ?? searchParams.cities),
    positions: asList(searchParams.position ?? searchParams.positions),
    classYears: asList(searchParams.classYear ?? searchParams.class_year ?? searchParams.classYears),
    seasonYears: asList(searchParams.seasonYear ?? searchParams.season_year ?? searchParams.seasonYears),
    careers: asList(searchParams.career ?? searchParams.careers ?? searchParams.industry ?? searchParams.industries),
    personKinds: parsePersonKinds(
      asList(
        searchParams.personKind ??
          searchParams.personKinds ??
          searchParams.kind ??
          searchParams.affiliation ??
          searchParams.role,
      ),
    ),
    hasEmail: flag(searchParams, "hasEmail", "has_email"),
    hasPhone: flag(searchParams, "hasPhone", "has_phone"),
    hasLinkedin: flag(searchParams, "hasLinkedin", "has_linkedin"),
    registered: flag(searchParams, "registered", "claimed", "hasRegistered"),
  });
}

export function parseSelectedIds(searchParams: Record<string, string | string[] | undefined>) {
  return asList(searchParams.ids ?? searchParams.id);
}

export function parsePage(searchParams: Record<string, string | string[] | undefined>) {
  const raw = searchParams.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function hasFacetFilters(filters: AlumniFilters) {
  return Boolean(
    filters.states.length ||
      filters.cities.length ||
      filters.positions.length ||
      filters.classYears.length ||
      filters.seasonYears.length ||
      filters.careers.length ||
      filters.personKinds.length ||
      filters.hasEmail ||
      filters.hasPhone ||
      filters.hasLinkedin ||
      filters.registered,
  );
}

export function facetFilterCount(filters: AlumniFilters) {
  return (
    filters.states.length +
    filters.cities.length +
    filters.positions.length +
    filters.classYears.length +
    filters.seasonYears.length +
    filters.careers.length +
    filters.personKinds.length +
    (filters.hasEmail ? 1 : 0) +
    (filters.hasPhone ? 1 : 0) +
    (filters.hasLinkedin ? 1 : 0) +
    (filters.registered ? 1 : 0)
  );
}

export function hasActiveFilters(filters: AlumniFilters) {
  return Boolean(filters.q || hasFacetFilters(filters));
}

export function parseHighlightId(searchParams: Record<string, string | string[] | undefined>) {
  return first(searchParams, "highlight") || first(searchParams, "person");
}

export type FilterChip = {
  id: string;
  label: string;
  href: string;
};

export function alumniFilterChips(filters: AlumniFilters, action = "/"): FilterChip[] {
  const hrefFor = (next: AlumniFilters) => {
    const qs = filtersToSearchParams(next).toString();
    return qs ? `${action}?${qs}` : action;
  };
  const chips: FilterChip[] = [];
  if (filters.q) {
    chips.push({ id: "q", label: `Search: ${filters.q}`, href: hrefFor({ ...filters, q: "" }) });
  }
  for (const value of filters.states) {
    chips.push({
      id: `state-${value}`,
      label: `State: ${value}`,
      href: hrefFor({ ...filters, states: filters.states.filter((item) => item !== value) }),
    });
  }
  for (const value of filters.cities) {
    chips.push({
      id: `city-${value}`,
      label: `City: ${value}`,
      href: hrefFor({ ...filters, cities: filters.cities.filter((item) => item !== value) }),
    });
  }
  for (const value of filters.positions) {
    chips.push({
      id: `position-${value}`,
      label: `Position: ${value}`,
      href: hrefFor({ ...filters, positions: filters.positions.filter((item) => item !== value) }),
    });
  }
  for (const value of filters.classYears) {
    chips.push({
      id: `class-${value}`,
      label: `Class: ${value}`,
      href: hrefFor({ ...filters, classYears: filters.classYears.filter((item) => item !== value) }),
    });
  }
  for (const value of filters.seasonYears) {
    chips.push({
      id: `season-${value}`,
      label: `Season: ${value}`,
      href: hrefFor({ ...filters, seasonYears: filters.seasonYears.filter((item) => item !== value) }),
    });
  }
  for (const value of filters.careers) {
    chips.push({
      id: `career-${value}`,
      label: `Career: ${value}`,
      href: hrefFor({ ...filters, careers: filters.careers.filter((item) => item !== value) }),
    });
  }
  if (filters.hasEmail) chips.push({ id: "email", label: "Has email", href: hrefFor({ ...filters, hasEmail: false }) });
  if (filters.hasPhone) chips.push({ id: "phone", label: "Has phone", href: hrefFor({ ...filters, hasPhone: false }) });
  if (filters.hasLinkedin) {
    chips.push({ id: "linkedin", label: "Has LinkedIn", href: hrefFor({ ...filters, hasLinkedin: false }) });
  }
  if (filters.registered) {
    chips.push({ id: "registered", label: "Registered", href: hrefFor({ ...filters, registered: false }) });
  }
  for (const value of filters.personKinds) {
    chips.push({
      id: `kind-${value}`,
      label: PERSON_KIND_LABELS[value],
      href: hrefFor({ ...filters, personKinds: filters.personKinds.filter((item) => item !== value) }),
    });
  }
  return chips;
}

export function filtersToSearchParams(filters: AlumniFilters, page?: number, ids?: string[]) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  for (const value of filters.states) params.append("state", value);
  for (const value of filters.cities) params.append("city", value);
  for (const value of filters.positions) params.append("position", value);
  for (const value of filters.classYears) params.append("classYear", value);
  for (const value of filters.seasonYears) params.append("seasonYear", value);
  for (const value of filters.careers) params.append("career", value);
  for (const value of filters.personKinds) params.append("personKind", value);
  if (filters.hasEmail) params.set("hasEmail", "1");
  if (filters.hasPhone) params.set("hasPhone", "1");
  if (filters.hasLinkedin) params.set("hasLinkedin", "1");
  if (filters.registered) params.set("registered", "1");
  if (ids?.length) {
    for (const id of ids) params.append("ids", id);
  }
  if (page && page > 1) params.set("page", String(page));
  return params;
}

export type QueryParts = {
  whereSql: string;
  params: unknown[];
};

function pushAnyMatch(
  where: string[],
  params: unknown[],
  start: number,
  values: string[],
  sql: (index: number) => string,
) {
  if (values.length === 0) return start;
  where.push(sql(start));
  params.push(values);
  return start + 1;
}

export function buildAlumniWhere(
  filters: AlumniFilters,
  startIndex = 1,
  extra?: { ids?: string[]; idsOnly?: boolean },
): QueryParts {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = startIndex;

  if (extra?.idsOnly && extra.ids?.length) {
    where.push(`a.id = ANY($${i}::uuid[])`);
    params.push(extra.ids);
    return { whereSql: `WHERE ${where.join(" AND ")}`, params };
  }

  if (filters.q) {
    where.push(`(
      coalesce(a.full_name, '') ILIKE $${i}
      OR coalesce(a.first_name, '') ILIKE $${i}
      OR coalesce(a.last_name, '') ILIKE $${i}
      OR coalesce(a.preferred_name, '') ILIKE $${i}
      OR coalesce(a.company_name, '') ILIKE $${i}
      OR coalesce(a.job_title, '') ILIKE $${i}
      OR coalesce(a.industry, '') ILIKE $${i}
      OR coalesce(a.current_city, '') ILIKE $${i}
      OR coalesce(a.hometown_city, '') ILIKE $${i}
      OR coalesce(a.email_primary, '') ILIKE $${i}
    )`);
    params.push(`%${filters.q}%`);
    i += 1;
  }

  i = pushAnyMatch(
    where,
    params,
    i,
    filters.states,
    (index) => `(a.current_state = ANY($${index}::text[]) OR a.hometown_state = ANY($${index}::text[]))`,
  );

  i = pushAnyMatch(
    where,
    params,
    i,
    filters.cities,
    (index) => `(a.current_city = ANY($${index}::text[]) OR a.hometown_city = ANY($${index}::text[]))`,
  );

  i = pushAnyMatch(
    where,
    params,
    i,
    filters.positions,
    (index) => `(
      a.position = ANY($${index}::text[])
      OR EXISTS (
        SELECT 1 FROM alumni_roster_years r
        WHERE r.alumni_id = a.id AND r.position = ANY($${index}::text[])
      )
    )`,
  );

  i = pushAnyMatch(where, params, i, filters.classYears, (index) => `a.class_year = ANY($${index}::text[])`);

  i = pushAnyMatch(
    where,
    params,
    i,
    filters.careers,
    (index) => `(
      a.industry = ANY($${index}::text[])
      OR a.job_title = ANY($${index}::text[])
      OR a.company_name = ANY($${index}::text[])
    )`,
  );

  if (filters.seasonYears.length) {
    const years = filters.seasonYears
      .map((value) => Number.parseInt(value, 10))
      .filter((year) => Number.isFinite(year));
    if (years.length) {
      const likeParts = years.map((_, offset) => `a.seasons ILIKE $${i + 1 + offset}`);
      where.push(`(
        EXISTS (
          SELECT 1 FROM alumni_roster_years r
          WHERE r.alumni_id = a.id AND r.year = ANY($${i}::int[])
        )
        OR ${likeParts.join(" OR ")}
      )`);
      params.push(years, ...years.map((year) => `%${year}%`));
      i += 1 + years.length;
    }
  }

  if (filters.hasEmail) {
    where.push(`(
      (a.email_primary IS NOT NULL AND btrim(a.email_primary) <> '')
      OR EXISTS (SELECT 1 FROM alumni_emails e WHERE e.alumni_id = a.id)
    )`);
  }

  if (filters.hasPhone) {
    where.push(`(
      (a.phone_primary IS NOT NULL AND btrim(a.phone_primary) <> '')
      OR EXISTS (SELECT 1 FROM alumni_phones p WHERE p.alumni_id = a.id)
    )`);
  }

  if (filters.hasLinkedin) {
    where.push(`(a.linkedin_url IS NOT NULL AND btrim(a.linkedin_url) <> '')`);
  }

  if (filters.registered) {
    where.push(`EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id)`);
  }

  if (filters.personKinds.length === 1) {
    where.push(`coalesce(a.person_kind, 'alum') = $${i}`);
    params.push(filters.personKinds[0]);
    i += 1;
  } else if (filters.personKinds.length > 1) {
    where.push(`coalesce(a.person_kind, 'alum') = ANY($${i}::text[])`);
    params.push(filters.personKinds);
    i += 1;
  }

  if (extra?.ids?.length && !extra.idsOnly) {
    const filterSql = where.length ? `(${where.join(" AND ")})` : "TRUE";
    where.length = 0;
    where.push(`(${filterSql} OR a.id = ANY($${i}::uuid[]))`);
    params.push(extra.ids);
    i += 1;
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return asList(typeof value === "string" ? value : undefined);
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

export function coerceAlumniFilters(input: unknown): AlumniFilters {
  if (!input || typeof input !== "object") return emptyFilters();
  const rec = input as Record<string, unknown>;
  if (
    Array.isArray(rec.states) ||
    Array.isArray(rec.cities) ||
    Array.isArray(rec.positions) ||
    Array.isArray(rec.classYears) ||
    Array.isArray(rec.seasonYears) ||
    Array.isArray(rec.careers)
  ) {
    return canonicalizeAlumniFilters({
      q: typeof rec.q === "string" ? rec.q : "",
      states: asStringArray(rec.states),
      cities: asStringArray(rec.cities),
      positions: asStringArray(rec.positions),
      classYears: asStringArray(rec.classYears),
      seasonYears: asStringArray(rec.seasonYears),
      careers: asStringArray(rec.careers),
      personKinds: parsePersonKinds(asStringArray(rec.personKinds ?? rec.personKind)),
      hasEmail: Boolean(rec.hasEmail),
      hasPhone: Boolean(rec.hasPhone),
      hasLinkedin: Boolean(rec.hasLinkedin),
      registered: Boolean(rec.registered),
    });
  }
  return parseAlumniFilters(rec as Record<string, string | string[] | undefined>);
}

export function emptyFilters(): AlumniFilters {
  return {
    q: "",
    states: [],
    cities: [],
    positions: [],
    classYears: [],
    seasonYears: [],
    careers: [],
    personKinds: [],
    hasEmail: false,
    hasPhone: false,
    hasLinkedin: false,
    registered: false,
  };
}
