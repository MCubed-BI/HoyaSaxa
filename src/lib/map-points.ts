import { displayName } from "@/lib/format";
import type { AlumniFilters } from "@/lib/filters";
import { resolveAlumniLocations } from "@/lib/geocode";
import { getAlumniLocationRows } from "@/lib/queries";
import type { AlumniMapPoint } from "@/lib/types";

/**
 * Tiny deterministic offset so alumni sharing a city centroid remain clickable.
 * Applied only when rendering pins — heat uses true geocode coordinates.
 */
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
  let mappedAlumni = 0;

  // Geocode sequentially so Nominatim rate limiting stays honest when enabled.
  for (const row of rows) {
    const resolvedList = await resolveAlumniLocations(row);
    if (resolvedList.length === 0) continue;
    mappedAlumni += 1;
    for (const resolved of resolvedList) {
      if (resolved.method === "none") continue;
      const source = resolved.source === "unknown" ? "address" : resolved.source;
      const markerKey = `${row.id}-${source}`;
      points.push({
        id: markerKey,
        alumniId: row.id,
        name: displayName(row),
        // Exact geocode coords — pin UI adds displayJitter client-side.
        lat: resolved.lat,
        lng: resolved.lng,
        locationLabel: resolved.label,
        locationSource: source,
        geocodeMethod: resolved.method,
        classYear: row.class_year,
        position: row.position,
        personKind: row.person_kind === "supporter" ? "supporter" : "alum",
      });
    }
  }

  return {
    points,
    totalAlumni: rows.length,
    mappedCount: mappedAlumni,
    skippedCount: rows.length - mappedAlumni,
  };
}
