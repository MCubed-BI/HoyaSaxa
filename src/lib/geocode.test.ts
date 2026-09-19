import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  parseAddressCityState,
  resetGeocodeCache,
  resolveAlumniLocation,
} from "./geocode";
import { displayJitter } from "./map-points";
import { cityStateKey, normalizeState } from "./us-centroids";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  resetGeocodeCache();
});

describe("us centroids", () => {
  it("normalizes codes and names", () => {
    assert.equal(normalizeState("dc"), "DC");
    assert.equal(normalizeState("Virginia"), "VA");
    assert.equal(normalizeState("ca"), "CA");
    assert.equal(cityStateKey("Washington", "DC"), "washington|DC");
  });
});

describe("geocode", () => {
  it("parses US city/state from an address", () => {
    assert.deepEqual(parseAddressCityState("123 Main St, Arlington, VA 22201"), {
      city: "Arlington",
      state: "VA",
    });
    assert.deepEqual(parseAddressCityState("Arlington, VA"), {
      city: "Arlington",
      state: "VA",
    });
  });

  it("prefers current city over hometown and uses a city centroid", async () => {
    process.env.GEOCODE_PROVIDER = "centroids";
    const resolved = await resolveAlumniLocation({
      id: "11111111-1111-4111-8111-111111111111",
      first_name: "Pat",
      last_name: "Hoya",
      preferred_name: null,
      full_name: null,
      position: "QB",
      class_year: "2015",
      current_city: "Washington",
      current_state: "DC",
      hometown_city: "Dallas",
      hometown_state: "TX",
      address_primary: null,
    });
    assert.ok(resolved);
    assert.equal(resolved?.source, "current");
    assert.equal(resolved?.method, "city");
    assert.equal(resolved?.label, "Washington, DC");
    assert.ok(Math.abs((resolved?.lat ?? 0) - 38.907192) < 0.001);
  });

  it("falls back to hometown, then a parsed address", async () => {
    process.env.GEOCODE_PROVIDER = "centroids";
    const hometown = await resolveAlumniLocation({
      id: "22222222-2222-4222-8222-222222222222",
      first_name: "Sam",
      last_name: "Hoya",
      preferred_name: null,
      full_name: null,
      position: null,
      class_year: null,
      current_city: null,
      current_state: null,
      hometown_city: "Boston",
      hometown_state: "MA",
      address_primary: "1 Main, Dallas, TX 75201",
    });
    assert.equal(hometown?.source, "hometown");
    assert.equal(hometown?.method, "city");

    const address = await resolveAlumniLocation({
      id: "33333333-3333-4333-8333-333333333333",
      first_name: "Lee",
      last_name: "Hoya",
      preferred_name: null,
      full_name: null,
      position: null,
      class_year: null,
      current_city: null,
      current_state: null,
      hometown_city: null,
      hometown_state: null,
      address_primary: "2000 Pennsylvania Ave, Washington, DC 20006",
    });
    assert.equal(address?.source, "address");
    assert.equal(address?.method, "city");
  });

  it("uses a jittered state centroid when the city is unknown", async () => {
    process.env.GEOCODE_PROVIDER = "centroids";
    const resolved = await resolveAlumniLocation({
      id: "44444444-4444-4444-8444-444444444444",
      first_name: "Alex",
      last_name: "Hoya",
      preferred_name: null,
      full_name: null,
      position: null,
      class_year: null,
      current_city: "NotARealCity",
      current_state: "MD",
      hometown_city: null,
      hometown_state: null,
      address_primary: null,
    });
    assert.equal(resolved?.method, "state");
    assert.ok(resolved && Math.abs(resolved.lat - 39.063946) < 0.4);
  });
});

describe("map points", () => {
  it("jitters shared city pins deterministically", () => {
    const a = displayJitter("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const b = displayJitter("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    assert.deepEqual(displayJitter("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), a);
    assert.notDeepEqual(a, b);
    assert.ok(Math.abs(a.lat) <= 0.02);
  });
});
