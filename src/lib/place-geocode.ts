import { getSql } from "@/lib/db";
import { ensurePlaceGeocodeTable } from "@/lib/place-geocode-schema";
import {
  US_CITY_CENTROIDS,
  cityStateKey,
  normalizeCity,
  normalizeState,
} from "@/lib/us-centroids";

export type PlaceGeocodeMethod = "city" | "geocoded" | "state" | "none";

export type PlaceGeocodeHit = {
  lat: number;
  lng: number;
  method: PlaceGeocodeMethod;
  provider: string;
  label?: string | null;
};

function formatLabel(city: string | null, state: string | null) {
  const cityLabel = city?.trim() || "";
  const stateLabel = normalizeState(state) ?? state?.trim() ?? "";
  return [cityLabel, stateLabel].filter(Boolean).join(", ") || "Unknown";
}

export function placeKeyParts(city: string | null | undefined, state: string | null | undefined) {
  const cityKey = normalizeCity(city);
  const stateKey = normalizeState(state);
  if (!cityKey || !stateKey) return null;
  return { cityKey, stateKey, rawCity: city?.trim() || cityKey };
}

/** Seed hard-coded centroids into the DB cache (idempotent upsert). */
export async function seedCentroidPlaceGeocodes() {
  await ensurePlaceGeocodeTable();
  const sql = getSql();
  const entries = Object.entries(US_CITY_CENTROIDS);
  // Batch upserts in chunks
  const chunkSize = 80;
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    const values: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (const [key, coords] of chunk) {
      const [cityPart, statePart] = key.split("|");
      if (!cityPart || !statePart || !coords) continue;
      values.push(`($${p}, $${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, 'city', 'centroid', $${p + 5}, now(), now())`);
      params.push(cityPart, statePart, cityPart, coords[0], coords[1], `${cityPart}, ${statePart}`);
      p += 6;
    }
    if (!values.length) continue;
    await sql.query(
      `
      INSERT INTO place_geocodes (city_key, state, city_raw, lat, lng, method, provider, label, created_at, updated_at)
      VALUES ${values.join(",")}
      ON CONFLICT (city_key, state) DO UPDATE SET
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        method = CASE
          WHEN place_geocodes.method IN ('geocoded', 'city') THEN place_geocodes.method
          ELSE EXCLUDED.method
        END,
        provider = CASE
          WHEN place_geocodes.method = 'geocoded' THEN place_geocodes.provider
          ELSE EXCLUDED.provider
        END,
        updated_at = now()
      `,
      params,
    );
  }
}

export async function lookupCachedPlaceGeocode(
  city: string | null | undefined,
  state: string | null | undefined,
): Promise<PlaceGeocodeHit | null> {
  const parts = placeKeyParts(city, state);
  if (!parts) return null;
  const hits = await lookupCachedPlaceGeocodesBatch([
    { city: parts.rawCity, state: parts.stateKey },
  ]);
  return hits.get(`${parts.cityKey}|${parts.stateKey}`) ?? null;
}

/**
 * One round-trip for many city|state keys. Used to warm the map page so we
 * do not N+1 query place_geocodes (or hit Nominatim) per alumnus.
 */
export async function lookupCachedPlaceGeocodesBatch(
  places: Array<{ city: string | null | undefined; state: string | null | undefined }>,
): Promise<Map<string, PlaceGeocodeHit>> {
  const out = new Map<string, PlaceGeocodeHit>();
  const keys: Array<{ cityKey: string; stateKey: string }> = [];
  const seen = new Set<string>();
  for (const place of places) {
    const parts = placeKeyParts(place.city, place.state);
    if (!parts) continue;
    const id = `${parts.cityKey}|${parts.stateKey}`;
    if (seen.has(id)) continue;
    seen.add(id);
    keys.push({ cityKey: parts.cityKey, stateKey: parts.stateKey });
  }
  if (!keys.length) return out;

  await ensurePlaceGeocodeTable();
  const sql = getSql();
  const cityKeys = keys.map((k) => k.cityKey);
  const stateKeys = keys.map((k) => k.stateKey);
  const rows = (await sql.query(
    `
    SELECT g.city_key, g.state, g.lat, g.lng, g.method, g.provider, g.label
    FROM place_geocodes g
    INNER JOIN unnest($1::text[], $2::text[]) AS q(city_key, state)
      ON g.city_key = q.city_key AND g.state = q.state
    WHERE g.method IN ('city', 'geocoded')
    `,
    [cityKeys, stateKeys],
  )) as Array<{
    city_key: string;
    state: string;
    lat: number;
    lng: number;
    method: string;
    provider: string;
    label: string | null;
  }>;

  for (const row of rows) {
    if (row.method !== "city" && row.method !== "geocoded") continue;
    out.set(`${row.city_key}|${row.state}`, {
      lat: Number(row.lat),
      lng: Number(row.lng),
      method: row.method as PlaceGeocodeHit["method"],
      provider: row.provider,
      label: row.label,
    });
  }
  return out;
}

export async function persistPlaceGeocode(input: {
  city: string | null | undefined;
  state: string | null | undefined;
  lat: number;
  lng: number;
  method: "city" | "geocoded";
  provider: string;
}) {
  const parts = placeKeyParts(input.city, input.state);
  if (!parts) return;
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return;
  await ensurePlaceGeocodeTable();
  const sql = getSql();
  const label = formatLabel(input.city ?? parts.rawCity, parts.stateKey);
  await sql.query(
    `
    INSERT INTO place_geocodes (city_key, state, city_raw, lat, lng, method, provider, label, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
    ON CONFLICT (city_key, state) DO UPDATE SET
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      method = EXCLUDED.method,
      provider = EXCLUDED.provider,
      label = EXCLUDED.label,
      city_raw = EXCLUDED.city_raw,
      updated_at = now()
    `,
    [parts.cityKey, parts.stateKey, parts.rawCity, input.lat, input.lng, input.method, input.provider, label],
  );
}

/** Photon (OSM) — good for City, ST without a street address. */
export async function photonCityLookup(
  city: string,
  state: string,
): Promise<PlaceGeocodeHit | null> {
  const stateKey = normalizeState(state) ?? state.trim();
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", `${city.trim()}, ${stateKey}`);
  url.searchParams.set("limit", "3");
  url.searchParams.set("lang", "en");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: {
        countrycode?: string;
        state?: string;
        city?: string;
        name?: string;
        type?: string;
      };
    }>;
  };

  const cityNorm = normalizeCity(city);
  const stateNorm = stateKey.toUpperCase();
  const candidates: PlaceGeocodeHit[] = [];

  for (const feature of payload.features ?? []) {
    const props = feature.properties ?? {};
    if (props.countrycode && props.countrycode.toUpperCase() !== "US") continue;
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lng, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const propsState = normalizeState(props.state) ?? String(props.state || "").trim().toUpperCase();
    if (propsState && propsState.length === 2 && propsState !== stateNorm) continue;

    const nameNorm = normalizeCity(props.city || props.name || "");
    const nameOk =
      !nameNorm ||
      !cityNorm ||
      nameNorm === cityNorm ||
      nameNorm.includes(cityNorm) ||
      cityNorm.includes(nameNorm);
    if (!nameOk) continue;

    candidates.push({
      lat,
      lng,
      method: "geocoded",
      provider: "photon",
      label: formatLabel(city, stateKey),
    });
  }

  return candidates[0] ?? null;
}

export async function nominatimCityLookup(
  city: string,
  state: string,
): Promise<PlaceGeocodeHit | null> {
  const stateKey = normalizeState(state) ?? state.trim();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("city", city.trim());
  url.searchParams.set("state", stateKey);
  url.searchParams.set("country", "USA");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");

  const response = await fetch(url, {
    headers: {
      "User-Agent": process.env.GEOCODE_USER_AGENT?.trim() || "GeorgetownAlumMap/1.0",
      Accept: "application/json",
    },
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const lat = Number(rows[0]?.lat);
  const lng = Number(rows[0]?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    method: "geocoded",
    provider: "nominatim",
    label: formatLabel(city, stateKey),
  };
}

/** Resolve city+state to a city-level point (never state-center). */
export async function resolveCityStateAccurate(
  city: string | null | undefined,
  state: string | null | undefined,
  options?: { allowNetwork?: boolean },
): Promise<PlaceGeocodeHit | null> {
  const parts = placeKeyParts(city, state);
  if (!parts) return null;

  const cached = await lookupCachedPlaceGeocode(parts.rawCity, parts.stateKey);
  if (cached) return cached;

  const centroidKey = cityStateKey(parts.rawCity, parts.stateKey);
  if (centroidKey && US_CITY_CENTROIDS[centroidKey]) {
    const [lat, lng] = US_CITY_CENTROIDS[centroidKey]!;
    const hit: PlaceGeocodeHit = { lat, lng, method: "city", provider: "centroid" };
    await persistPlaceGeocode({
      city: parts.rawCity,
      state: parts.stateKey,
      lat,
      lng,
      method: "city",
      provider: "centroid",
    }).catch(() => undefined);
    return hit;
  }

  if (options?.allowNetwork === false) return null;

  let hit = await photonCityLookup(parts.rawCity, parts.stateKey).catch(() => null);
  if (!hit) {
    hit = await nominatimCityLookup(parts.rawCity, parts.stateKey).catch(() => null);
  }
  if (!hit) return null;

  await persistPlaceGeocode({
    city: parts.rawCity,
    state: parts.stateKey,
    lat: hit.lat,
    lng: hit.lng,
    method: "geocoded",
    provider: hit.provider,
  }).catch(() => undefined);
  return hit;
}

export async function listDistinctAlumniPlaces(): Promise<Array<{ city: string; state: string; n: number }>> {
  await ensurePlaceGeocodeTable();
  const sql = getSql();
  const rows = (await sql.query(
    `
    WITH places AS (
      SELECT btrim(current_city) AS city, upper(btrim(current_state)) AS state
      FROM alumni
      WHERE current_city IS NOT NULL AND btrim(current_city) <> ''
        AND current_state IS NOT NULL AND btrim(current_state) <> ''
      UNION ALL
      SELECT btrim(hometown_city), upper(btrim(hometown_state))
      FROM alumni
      WHERE hometown_city IS NOT NULL AND btrim(hometown_city) <> ''
        AND hometown_state IS NOT NULL AND btrim(hometown_state) <> ''
    )
    SELECT city, state, COUNT(*)::int AS n
    FROM places
    GROUP BY city, state
    ORDER BY n DESC, city, state
    `,
  )) as Array<{ city: string; state: string; n: number }>;
  return rows;
}

export async function listUncachedAlumniPlaces(): Promise<Array<{ city: string; state: string; n: number }>> {
  await ensurePlaceGeocodeTable();
  const sql = getSql();
  const rows = (await sql.query(
    `
    WITH places AS (
      SELECT btrim(current_city) AS city, upper(btrim(current_state)) AS state
      FROM alumni
      WHERE current_city IS NOT NULL AND btrim(current_city) <> ''
        AND current_state IS NOT NULL AND btrim(current_state) <> ''
      UNION ALL
      SELECT btrim(hometown_city), upper(btrim(hometown_state))
      FROM alumni
      WHERE hometown_city IS NOT NULL AND btrim(hometown_city) <> ''
        AND hometown_state IS NOT NULL AND btrim(hometown_state) <> ''
    ),
    distinct_places AS (
      SELECT city, state, COUNT(*)::int AS n
      FROM places
      GROUP BY city, state
    )
    SELECT d.city, d.state, d.n
    FROM distinct_places d
    LEFT JOIN place_geocodes g
      ON g.city_key = lower(regexp_replace(regexp_replace(d.city, '\\.', '', 'g'), '\\s+', ' ', 'g'))
     AND g.state = d.state
     AND g.method IN ('city', 'geocoded')
    WHERE g.city_key IS NULL
    ORDER BY d.n DESC, d.city, d.state
    `,
  )) as Array<{ city: string; state: string; n: number }>;
  return rows;
}

export async function placeGeocodeCoverage() {
  await ensurePlaceGeocodeTable();
  const sql = getSql();
  const rows = (await sql.query(
    `
    WITH places AS (
      SELECT btrim(current_city) AS city, upper(btrim(current_state)) AS state
      FROM alumni
      WHERE current_city IS NOT NULL AND btrim(current_city) <> ''
        AND current_state IS NOT NULL AND btrim(current_state) <> ''
      UNION ALL
      SELECT btrim(hometown_city), upper(btrim(hometown_state))
      FROM alumni
      WHERE hometown_city IS NOT NULL AND btrim(hometown_city) <> ''
        AND hometown_state IS NOT NULL AND btrim(hometown_state) <> ''
    ),
    distinct_places AS (
      SELECT DISTINCT city, state FROM places
    )
    SELECT
      (SELECT COUNT(*)::int FROM distinct_places) AS distinct_places,
      (
        SELECT COUNT(*)::int FROM distinct_places d
        INNER JOIN place_geocodes g
          ON g.state = d.state
         AND g.method IN ('city', 'geocoded')
         AND g.city_key = lower(regexp_replace(regexp_replace(d.city, '\\.', '', 'g'), '\\s+', ' ', 'g'))
      ) AS city_accurate,
      (SELECT COUNT(*)::int FROM place_geocodes WHERE method IN ('city', 'geocoded')) AS cached_places
    `,
  )) as Array<{ distinct_places: number; city_accurate: number; cached_places: number }>;
  return rows[0] ?? { distinct_places: 0, city_accurate: 0, cached_places: 0 };
}
