#!/usr/bin/env node
/**
 * Seed hard-coded US_CITY_CENTROIDS into place_geocodes.
 * Usage: node --env-file=.env.local --import tsx scripts/seed-place-geocodes.mjs
 */
import { seedCentroidPlaceGeocodes, placeGeocodeCoverage } from "../src/lib/place-geocode.ts";

await seedCentroidPlaceGeocodes();
const cov = await placeGeocodeCoverage();
console.log(JSON.stringify(cov, null, 2));
