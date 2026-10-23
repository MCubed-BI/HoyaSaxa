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
// Nominatim usage policy: ~1 req/sec. Photon is optional (often TLS-fails from some hosts).
const CONCURRENCY = Number(process.env.GEOCODE_CONCURRENCY || 1);
const DELAY_MS = Number(process.env.GEOCODE_DELAY_MS || 1100);
const MAX_ATTEMPTS = Number(process.env.GEOCODE_MAX_ATTEMPTS || 4);
const PREFER = (process.env.GEOCODE_PREFER || "nominatim").trim().toLowerCase();

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
    "st louis": "st louis",
    "saint paul": "st paul",
    "st paul": "st paul",
  };
  return aliases[cleaned] ?? cleaned;
}

function normalizeState(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\./g, "").trim();
  if (!cleaned) return null;
  const upper = cleaned.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  return STATE_NAMES[cleaned.toLowerCase()] ?? null;
}

/** Drop obvious junk from bad spreadsheet cells. */
function sanitizePlace(city, state) {
  let c = String(city || "").trim();
  let s = String(state || "").trim();
  if (!c || !s) return null;
  if (c.includes(":::") || s.includes(":::")) return null;
  if (/\d{3,}/.test(c)) return null; // street numbers / zips in city
  if (/street|avenue|road|drive|lane|blvd/i.test(c)) return null;
  // "Arlington, VA" stuffed into city
  const embedded = c.match(/^([^,]+),\s*([A-Za-z]{2})\s*$/);
  if (embedded) {
    c = embedded[1].trim();
    if (!normalizeState(s)) s = embedded[2];
  }
  const cityKey = normalizeCity(c);
  const stateKey = normalizeState(s);
  if (!cityKey || !stateKey) return null;
  if (cityKey.length < 2 || cityKey.length > 48) return null;
  return { city: c, state: stateKey, cityKey, stateKey };
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

async function upsert(city, stateKey, cityKey, lat, lng, method, provider) {
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

async function photon(city, stateKey) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", `${city}, ${stateKey}`);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "en");
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const err = new Error(`photon HTTP ${res.status}`);
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
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

async function nominatim(city, stateKey) {
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
  if (!res.ok) {
    const err = new Error(`nominatim HTTP ${res.status}`);
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const rows = await res.json();
  const lat = Number(rows[0]?.lat);
  const lng = Number(rows[0]?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, provider: "nominatim" };
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function tryProvider(name, city, stateKey) {
  if (name === "photon") return photon(city, stateKey);
  return nominatim(city, stateKey);
}

async function resolveWithRetry(city, stateKey) {
  const order = PREFER === "photon" ? ["photon", "nominatim"] : ["nominatim", "photon"];
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    for (const name of order) {
      try {
        await sleep(name === "nominatim" ? DELAY_MS : Math.min(DELAY_MS, 400));
        const hit = await tryProvider(name, city, stateKey);
        if (hit) return hit;
      } catch (err) {
        lastErr = err;
        const retryable =
          err?.retryable ||
          /fetch failed|ECONNRESET|ETIMEDOUT|socket|SSL|HTTP 429|HTTP 5/i.test(String(err?.message || err));
        // Photon TLS failures are common here — skip to nominatim without burning attempts.
        if (name === "photon" && /SSL|ECONNRESET|fetch failed|socket/i.test(String(err?.message || err))) {
          continue;
        }
        if (!retryable) throw err;
      }
    }
    if (attempt < MAX_ATTEMPTS) await sleep(1500 * attempt);
  }
  if (lastErr) throw lastErr;
  return null;
}

async function main() {
  await ensureTable();
  const places = await listDistinctPlaces();
  const have = await cachedKeys();
  const pending = [];
  let skippedJunk = 0;
  for (const p of places) {
    const clean = sanitizePlace(p.city, p.state);
    if (!clean) {
      skippedJunk += 1;
      continue;
    }
    const key = `${clean.cityKey}|${clean.stateKey}`;
    if (have.has(key)) continue;
    pending.push({ ...clean, n: p.n, key });
  }
  // Dedupe by normalized key (keep highest n)
  const byKey = new Map();
  for (const p of pending) {
    const prev = byKey.get(p.key);
    if (!prev || p.n > prev.n) byKey.set(p.key, p);
  }
  const queue = [...byKey.values()];
  console.log(
    JSON.stringify({
      distinct: places.length,
      cached: have.size,
      pending: queue.length,
      skippedJunk,
      concurrency: CONCURRENCY,
      delayMs: DELAY_MS,
    }),
  );

  let ok = 0;
  let fail = 0;
  let idx = 0;

  async function worker() {
    while (idx < queue.length) {
      const i = idx++;
      const place = queue[i];
      try {
        const hit = await resolveWithRetry(place.city, place.stateKey);
        if (!hit) {
          fail += 1;
          console.log(`FAIL ${place.city}, ${place.stateKey} (n=${place.n})`);
          continue;
        }
        await upsert(place.city, place.stateKey, place.cityKey, hit.lat, hit.lng, "geocoded", hit.provider);
        ok += 1;
        if (ok % 25 === 0 || i < 5) {
          console.log(`OK ${ok}/${queue.length} ${place.city}, ${place.stateKey} via ${hit.provider}`);
        }
      } catch (err) {
        fail += 1;
        console.log(`ERR ${place.city}, ${place.stateKey}: ${err instanceof Error ? err.message : err}`);
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
