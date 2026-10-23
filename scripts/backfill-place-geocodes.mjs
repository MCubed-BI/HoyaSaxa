#!/usr/bin/env node
/**
 * Backfill place_geocodes for every distinct alumni city|state.
 * Usage: node --env-file=.env.local scripts/backfill-place-geocodes.mjs
 *        DATABASE_URL=... node scripts/backfill-place-geocodes.mjs
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(url);
const CONCURRENCY = Number(process.env.GEOCODE_CONCURRENCY || 3);
const DELAY_MS = Number(process.env.GEOCODE_DELAY_MS || 200);

function normalizeCity(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!cleaned) return null;
  const aliases = {
    nyc: "new york",
    "new york city": "new york",
    "new york ny": "new york",
    "washington dc": "washington",
    "washington d c": "washington",
    "ft lauderdale": "fort lauderdale",
    "ft worth": "fort worth",
    "saint louis": "st louis",
    "st. louis": "st louis",
    "saint paul": "st paul",
    "st. paul": "st paul",
  };
  return aliases[cleaned] ?? cleaned;
}

const STATE_NAMES = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "district of columbia": "DC", "washington dc": "DC",
};

function normalizeState(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\./g, "").trim();
  if (!cleaned) return null;
  const upper = cleaned.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  return STATE_NAMES[cleaned.toLowerCase()] ?? null;
}

async function ensureTable() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS place_geocodes (
      city_key text NOT NULL,
      state text NOT NULL,
      city_raw text,
      lat double precision NOT NULL,
      lng double precision NOT NULL,
      method text NOT NULL,
      provider text NOT NULL DEFAULT 'unknown',
      label text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (city_key, state)
    )
  `);
}

async function listDistinctPlaces() {
  return sql.query(`
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
  `);
}

async function cachedKeys() {
  const rows = await sql.query(`SELECT city_key, state FROM place_geocodes WHERE method IN ('city','geocoded')`);
  return new Set(rows.map((r) => `${r.city_key}|${r.state}`));
}

async function upsert(city, state, lat, lng, method, provider) {
  const cityKey = normalizeCity(city);
  const stateKey = normalizeState(state);
  if (!cityKey || !stateKey) return;
  const label = `${String(city).trim()}, ${stateKey}`;
  await sql.query(
    `
    INSERT INTO place_geocodes (city_key, state, city_raw, lat, lng, method, provider, label, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),now())
    ON CONFLICT (city_key, state) DO UPDATE SET
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      method = EXCLUDED.method,
      provider = EXCLUDED.provider,
      label = EXCLUDED.label,
      city_raw = EXCLUDED.city_raw,
      updated_at = now()
    `,
    [cityKey, stateKey, String(city).trim(), lat, lng, method, provider, label],
  );
}

async function photon(city, state) {
  const stateKey = normalizeState(state);
  if (!stateKey) return null;
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", `${city}, ${stateKey}`);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "en");
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  const cityNorm = normalizeCity(city);
  for (const feature of data.features || []) {
    const props = feature.properties || {};
    if (props.countrycode && String(props.countrycode).toUpperCase() !== "US") continue;
    const featureState = normalizeState(props.state);
    if (featureState && featureState !== stateKey) continue;
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lng, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const nameNorm = normalizeCity(props.city || props.name || "");
    if (nameNorm && cityNorm && nameNorm !== cityNorm && !nameNorm.includes(cityNorm) && !cityNorm.includes(nameNorm)) {
      continue;
    }
    return { lat, lng, provider: "photon" };
  }
  return null;
}

async function nominatim(city, state) {
  const stateKey = normalizeState(state);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("city", city);
  url.searchParams.set("state", stateKey);
  url.searchParams.set("country", "USA");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  const res = await fetch(url, {
    headers: {
      "User-Agent": process.env.GEOCODE_USER_AGENT || "GeorgetownAlumMap/1.0 (backfill)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const lat = Number(rows[0]?.lat);
  const lng = Number(rows[0]?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, provider: "nominatim" };
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  await ensureTable();
  const places = await listDistinctPlaces();
  const have = await cachedKeys();
  const pending = places.filter((p) => {
    const key = `${normalizeCity(p.city)}|${normalizeState(p.state)}`;
    return key && !have.has(key);
  });
  console.log(`distinct=${places.length} cached=${have.size} pending=${pending.length} concurrency=${CONCURRENCY}`);

  let ok = 0;
  let fail = 0;
  let idx = 0;

  async function worker() {
    while (idx < pending.length) {
      const i = idx++;
      const place = pending[i];
      try {
        await sleep(DELAY_MS);
        let hit = await photon(place.city, place.state);
        if (!hit) {
          await sleep(1100);
          hit = await nominatim(place.city, place.state);
        }
        if (!hit) {
          fail += 1;
          console.log(`FAIL ${place.city}, ${place.state} (n=${place.n})`);
          continue;
        }
        await upsert(place.city, place.state, hit.lat, hit.lng, "geocoded", hit.provider);
        ok += 1;
        if (ok % 25 === 0 || i < 5) {
          console.log(`OK ${ok}/${pending.length} ${place.city}, ${place.state} via ${hit.provider}`);
        }
      } catch (err) {
        fail += 1;
        console.log(`ERR ${place.city}, ${place.state}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const after = await cachedKeys();
  console.log(JSON.stringify({ ok, fail, cachedAfter: after.size, distinct: places.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
