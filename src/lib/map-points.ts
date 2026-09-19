import { displayName } from "@/lib/format";
import type { AlumniFilters } from "@/lib/filters";
import { resolveAlumniLocation } from "@/lib/geocode";
import { getAlumniLocationRows } from "@/lib/queries";
import type { AlumniMapPoint } from "@/lib/types";

/** Tiny deterministic offset so alumni sharing a city centroid remain clickable. */
export function displayJitter(id: string): { lat: number; lng: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 1000) / 1000;
  const b = (((h >>> 8) % 1000) / 1000);
  return { lat: (a - 0.5) * 0.04, lng: (b - 0.5) * 0.04 };
}

export async function getAlumniMapPoints(filters: AlumniFilters): Promise<{
  points: AlumniMapPoint[];
  totalAlumni: number;
  mappedCount: number;
  skippedCount: number;
}> {
  const rows = await getAlumniLocationRows(filters);
  const points: AlumniMapPoint[] = [];

  // Geocode sequentially so Nominatim rate limiting stays honest when enabled.
  for (const row of rows) {
    const resolved = await resolveAlumniLocation(row);
    if (!resolved || resolved.method === "none") continue;
    const jitter = displayJitter(row.id);
    points.push({
      id: row.id,
      name: displayName(row),
      lat: resolved.lat + jitter.lat,
      lng: resolved.lng + jitter.lng,
      locationLabel: resolved.label,
      locationSource: resolved.source === "unknown" ? "address" : resolved.source,
      geocodeMethod: resolved.method,
      classYear: row.class_year,
      position: row.position,
    });
  }

  return {
    points,
    totalAlumni: rows.length,
    mappedCount: points.length,
    skippedCount: rows.length - points.length,
  };
}
