import {
  lookupCachedPlaceGeocode,
  lookupCachedPlaceGeocodesBatch,
  persistPlaceGeocode,
  photonCityLookup,
  nominatimCityLookup,
  placeKeyParts,
  type PlaceGeocodeHit,
} from "@/lib/place-geocode";
import {
  US_CITY_CENTROIDS,
  US_STATE_CENTROIDS,
  cityStateKey,
  normalizeCity,
  normalizeState,
} from "@/lib/us-centroids";

export type LatLng = { lat: number; lng: number };

export type ResolvedLocation = LatLng & {
  label: string;
  source: "current" | "hometown" | "address" | "unknown";
  method: "city" | "state" | "nominatim" | "geocoded" | "none";
};

export type AlumniLocationRow = {
  id: string;
  first_name: string | null;
  last_name: string;
  preferred_name: string | null;
  full_name: string | null;
  position: string | null;
  class_year: string | null;
  current_city: string | null;
  current_state: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  address_primary: string | null;
  person_kind?: "alum" | "supporter" | "development" | null;
};

/** Request-path geocoding must stay offline — Nominatim ~1 req/sec will 300s-timeout /find-my-alum. */
export type ResolvePlaceOptions = {
  /** When true, may call Photon/Nominatim. Default false (cache → centroid → state only). */
  allowNetwork?: boolean;
};

type CacheEntry = LatLng & { method: ResolvedLocation["method"] };

const memoryCache = new Map<string, CacheEntry | null>();
/** Keys batch-checked against place_geocodes this process — skip repeat DB lookups. */
const dbLookupDone = new Set<string>();
let lastNetworkGeocodeAt = 0;

function hashJitter(seed: string): [number, number] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 1000) / 1000;
  const b = ((h >>> 10) % 1000) / 1000;
  // ~±0.12° — keep state-fallback pins separable without spraying across the state
  return [(a - 0.5) * 0.24, (b - 0.5) * 0.2];
}

export function parseAddressCityState(address: string): { city: string | null; state: string | null } {
  const cleaned = address.replace(/\s+/g, " ").trim();
  const zipMatch = cleaned.match(/,\s*([^,]+),\s*([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?\s*$/);
  if (zipMatch) {
    return { city: zipMatch[1]!.trim(), state: zipMatch[2]!.trim() };
  }
  const short = cleaned.match(/([^,]+),\s*([A-Za-z]{2})\s*$/);
  if (short) {
    return { city: short[1]!.trim(), state: short[2]!.trim() };
  }
  return { city: null, state: null };
}

function formatLabel(city: string | null, state: string | null) {
  const cityLabel = city?.trim() || "";
  const stateLabel = normalizeState(state) ?? state?.trim() ?? "";
  return [cityLabel, stateLabel].filter(Boolean).join(", ") || "Unknown";
}

function geocodeProvider() {
  const raw = (process.env.GEOCODE_PROVIDER ?? "hybrid").trim().toLowerCase();
  if (raw === "nominatim" || raw === "centroids" || raw === "hybrid") return raw;
  return "hybrid";
}

function lookupCentroidOnly(city: string | null, state: string | null): CacheEntry | null {
  const key = cityStateKey(city, state);
  if (key && US_CITY_CENTROIDS[key]) {
    const [lat, lng] = US_CITY_CENTROIDS[key]!;
    return { lat, lng, method: "city" };
  }
  return null;
}

function lookupStateFallback(city: string | null, state: string | null): CacheEntry | null {
  const stateKey = normalizeState(state);
  if (!stateKey || !US_STATE_CENTROIDS[stateKey]) return null;
  const [lat, lng] = US_STATE_CENTROIDS[stateKey]!;
  const [dLat, dLng] = hashJitter(`${normalizeCity(city) ?? ""}|${stateKey}`);
  return { lat: lat + dLat, lng: lng + dLng, method: "state" };
}

function hitToCacheEntry(hit: PlaceGeocodeHit): CacheEntry {
  return {
    lat: hit.lat,
    lng: hit.lng,
    method: hit.method === "geocoded" ? "geocoded" : "city",
  };
}

async function throttleNetwork() {
  // Nominatim policy is ~1 req/sec; keep a bit of headroom for hybrid retries.
  const wait = Math.max(0, 1100 - (Date.now() - lastNetworkGeocodeAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNetworkGeocodeAt = Date.now();
}

function memoryCacheKey(city: string | null | undefined, state: string | null | undefined) {
  return `${normalizeCity(city) ?? ""}|${normalizeState(state) ?? state ?? ""}`;
}

/**
 * Prefetch place_geocodes (+ hard-coded centroids) into the in-memory map so
 * /find-my-alum can resolve every pin without per-row DB or network round-trips.
 */
export async function warmGeocodeCacheForRows(rows: AlumniLocationRow[]): Promise<void> {
  const places: Array<{ city: string | null; state: string | null }> = [];
  for (const row of rows) {
    places.push({ city: row.current_city, state: row.current_state });
    places.push({ city: row.hometown_city, state: row.hometown_state });
    if (row.address_primary?.trim()) {
      const parsed = parseAddressCityState(row.address_primary);
      places.push({ city: parsed.city, state: parsed.state });
    }
  }

  const toQuery: Array<{ city: string; state: string }> = [];
  const seen = new Set<string>();
  for (const place of places) {
    const parts = placeKeyParts(place.city, place.state);
    if (!parts) continue;
    const id = `${parts.cityKey}|${parts.stateKey}`;
    if (seen.has(id)) continue;
    seen.add(id);
    toQuery.push({ city: parts.rawCity, state: parts.stateKey });
  }

  try {
    const hits = await lookupCachedPlaceGeocodesBatch(toQuery);
    for (const [id, hit] of hits) {
      const [cityKey, stateKey] = id.split("|");
      const cacheKey = memoryCacheKey(cityKey, stateKey);
      memoryCache.set(cacheKey, hitToCacheEntry(hit));
      dbLookupDone.add(cacheKey);
    }
  } catch {
    // DB optional in unit tests without DATABASE_URL.
  }

  for (const place of toQuery) {
    const cacheKey = memoryCacheKey(place.city, place.state);
    dbLookupDone.add(cacheKey);
    if (memoryCache.has(cacheKey)) continue;
    const centroid = lookupCentroidOnly(place.city, place.state);
    if (centroid) {
      memoryCache.set(cacheKey, centroid);
      continue;
    }
    // Prefill state fallback so request-path resolve stays synchronous after warm.
    const stateHit = lookupStateFallback(place.city, place.state);
    if (stateHit) memoryCache.set(cacheKey, stateHit);
  }
}

/**
 * City+state: DB cache → hard-coded centroid → optional Photon/Nominatim (persisted).
 * State-only / failed city: loose state jitter (accuracy not required).
 * Network is opt-in — the Find My Alum page must never await Nominatim.
 */
async function resolvePlace(
  city: string | null,
  state: string | null,
  options?: ResolvePlaceOptions,
): Promise<CacheEntry | null> {
  const cacheKey = memoryCacheKey(city, state);
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey) ?? null;

  const parts = placeKeyParts(city, state);
  const provider = geocodeProvider();
  const allowNetwork = options?.allowNetwork === true;

  // City + state → must be city-accurate when possible.
  if (parts) {
    if (!dbLookupDone.has(cacheKey)) {
      try {
        const cached = await lookupCachedPlaceGeocode(parts.rawCity, parts.stateKey);
        dbLookupDone.add(cacheKey);
        if (cached) {
          const entry = hitToCacheEntry(cached);
          memoryCache.set(cacheKey, entry);
          return entry;
        }
      } catch {
        // DB optional in unit tests without DATABASE_URL.
      }
    }

    const centroid = lookupCentroidOnly(parts.rawCity, parts.stateKey);
    if (centroid) {
      memoryCache.set(cacheKey, centroid);
      // Persist only on explicit network/backfill paths — never on map page loads.
      if (allowNetwork) {
        try {
          await persistPlaceGeocode({
            city: parts.rawCity,
            state: parts.stateKey,
            lat: centroid.lat,
            lng: centroid.lng,
            method: "city",
            provider: "centroid",
          });
        } catch {
          // ignore persist failures
        }
      }
      return centroid;
    }

    if (allowNetwork && (provider === "hybrid" || provider === "nominatim")) {
      try {
        await throttleNetwork();
        // Prefer Nominatim for city+state (reliable US city lookup). Photon is optional —
        // some hosts see intermittent TLS failures to photon.komoot.io.
        let hit = await nominatimCityLookup(parts.rawCity, parts.stateKey).catch(() => null);
        if (!hit && provider === "hybrid") {
          await throttleNetwork();
          hit = await photonCityLookup(parts.rawCity, parts.stateKey).catch(() => null);
        }
        if (hit) {
          const entry = hitToCacheEntry(hit);
          memoryCache.set(cacheKey, entry);
          try {
            await persistPlaceGeocode({
              city: parts.rawCity,
              state: parts.stateKey,
              lat: hit.lat,
              lng: hit.lng,
              method: "geocoded",
              provider: hit.provider,
            });
          } catch {
            // ignore
          }
          return entry;
        }
      } catch {
        // fall through to state
      }
    }
  }

  // State-only or unresolved city — user said placement can be anywhere.
  const stateHit = lookupStateFallback(city, state);
  memoryCache.set(cacheKey, stateHit);
  return stateHit;
}

async function resolveAttempt(
  city: string | null,
  state: string | null,
  source: ResolvedLocation["source"],
  options?: ResolvePlaceOptions,
): Promise<ResolvedLocation | null> {
  if (!city?.trim() && !state?.trim()) return null;
  const resolved = await resolvePlace(city, state, options);
  if (!resolved) return null;
  return {
    ...resolved,
    label: formatLabel(city, state),
    source,
  };
}

/** Best single pin: current → hometown → parsed address (legacy callers / tests). */
export async function resolveAlumniLocation(
  row: AlumniLocationRow,
  options?: ResolvePlaceOptions,
): Promise<ResolvedLocation | null> {
  const current = await resolveAttempt(row.current_city, row.current_state, "current", options);
  if (current) return current;
  const hometown = await resolveAttempt(row.hometown_city, row.hometown_state, "hometown", options);
  if (hometown) return hometown;
  if (row.address_primary?.trim()) {
    const parsed = parseAddressCityState(row.address_primary);
    return resolveAttempt(parsed.city, parsed.state, "address", options);
  }
  return null;
}

/**
 * All mappable places for an alum: current and hometown when both resolve.
 * Address is only used when neither current nor hometown maps.
 */
export async function resolveAlumniLocations(
  row: AlumniLocationRow,
  options?: ResolvePlaceOptions,
): Promise<ResolvedLocation[]> {
  const out: ResolvedLocation[] = [];
  const current = await resolveAttempt(row.current_city, row.current_state, "current", options);
  if (current) out.push(current);
  const hometown = await resolveAttempt(row.hometown_city, row.hometown_state, "hometown", options);
  if (hometown) out.push(hometown);
  if (out.length === 0 && row.address_primary?.trim()) {
    const parsed = parseAddressCityState(row.address_primary);
    const address = await resolveAttempt(parsed.city, parsed.state, "address", options);
    if (address) out.push(address);
  }
  return out;
}

export function resetGeocodeCache() {
  memoryCache.clear();
  dbLookupDone.clear();
  lastNetworkGeocodeAt = 0;
}
