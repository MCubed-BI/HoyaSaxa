import { getSql } from "@/lib/db";

let ensured = false;

/** Durable city|state → lat/lng cache so the map does not re-hit external geocoders. */
export async function ensurePlaceGeocodeTable() {
  if (ensured) return;
  const sql = getSql();
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
  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_place_geocodes_method ON place_geocodes (method)
  `);
  ensured = true;
}

export function resetPlaceGeocodeTableCache() {
  ensured = false;
}
