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
  method: "city" | "state" | "nominatim" | "none";
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
};

type CacheEntry = LatLng & { method: ResolvedLocation["method"] };

const memoryCache = new Map<string, CacheEntry | null>();
let lastNominatimAt = 0;

function hashJitter(seed: string): [number, number] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 1000) / 1000;
  const b = (((h >>> 10) % 1000) / 1000);
  // ~±0.35° so unknown cities in a state fan out a bit
  return [(a - 0.5) * 0.7, (b - 0.5) * 0.5];
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
  const raw = (process.env.GEOCODE_PROVIDER ?? "centroids").trim().toLowerCase();
  if (raw === "nominatim" || raw === "hybrid") return raw;
  return "centroids";
}

function lookupCentroid(city: string | null, state: string | null): CacheEntry | null {
  const stateKey = normalizeState(state);
  const key = cityStateKey(city, state);
  if (key && US_CITY_CENTROIDS[key]) {
    const [lat, lng] = US_CITY_CENTROIDS[key]!;
    return { lat, lng, method: "city" };
  }
  if (stateKey && US_STATE_CENTROIDS[stateKey]) {
    const [lat, lng] = US_STATE_CENTROIDS[stateKey]!;
    const [dLat, dLng] = hashJitter(`${normalizeCity(city) ?? ""}|${stateKey}`);
    return { lat: lat + dLat, lng: lng + dLng, method: "state" };
  }
  return null;
}

async function nominatimLookup(city: string | null, state: string | null): Promise<CacheEntry | null> {
  const query = [city, normalizeState(state) ?? state, "USA"].filter(Boolean).join(", ");
  if (!query) return null;
  const wait = Math.max(0, 1100 - (Date.now() - lastNominatimAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNominatimAt = Date.now();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
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
  return { lat, lng, method: "nominatim" };
}

async function resolvePlace(city: string | null, state: string | null): Promise<CacheEntry | null> {
  const cacheKey = `${normalizeCity(city) ?? ""}|${normalizeState(state) ?? state ?? ""}`;
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey) ?? null;

  const provider = geocodeProvider();
  let resolved = provider === "nominatim" ? null : lookupCentroid(city, state);
  if ((!resolved || resolved.method === "state") && (provider === "nominatim" || provider === "hybrid")) {
    try {
      resolved = (await nominatimLookup(city, state)) ?? resolved;
    } catch {
      // Centroids stay the fallback when Nominatim is unavailable.
    }
  }

  memoryCache.set(cacheKey, resolved);
  return resolved;
}

export async function resolveAlumniLocation(row: AlumniLocationRow): Promise<ResolvedLocation | null> {
  const attempts: Array<{ city: string | null; state: string | null; source: ResolvedLocation["source"] }> = [
    { city: row.current_city, state: row.current_state, source: "current" },
    { city: row.hometown_city, state: row.hometown_state, source: "hometown" },
  ];

  if (row.address_primary?.trim()) {
    const parsed = parseAddressCityState(row.address_primary);
    attempts.push({ city: parsed.city, state: parsed.state, source: "address" });
  }

  for (const attempt of attempts) {
    if (!attempt.city?.trim() && !attempt.state?.trim()) continue;
    const resolved = await resolvePlace(attempt.city, attempt.state);
    if (!resolved) continue;
    return {
      ...resolved,
      label: formatLabel(attempt.city, attempt.state),
      source: attempt.source,
    };
  }

  return null;
}

export function resetGeocodeCache() {
  memoryCache.clear();
  lastNominatimAt = 0;
}
