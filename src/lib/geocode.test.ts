import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  parseAddressCityState,
  resetGeocodeCache,
  resolveAlumniLocation,
  resolveAlumniLocations,
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
    assert.ok(resolved && Math.abs(resolved.lat - 39.063946) < 0.15);
  });

  it("resolves common city aliases to city centroids", async () => {
    process.env.GEOCODE_PROVIDER = "centroids";
    const nyc = await resolveAlumniLocation({
      id: "77777777-7777-4777-8777-777777777777",
      first_name: "Pat",
      last_name: "Hoya",
      preferred_name: null,
      full_name: null,
      position: null,
      class_year: null,
      current_city: "New York City",
      current_state: "NY",
      hometown_city: null,
      hometown_state: null,
      address_primary: null,
    });
    assert.equal(nyc?.method, "city");
    assert.ok(Math.abs((nyc?.lat ?? 0) - 40.712776) < 0.001);
  });

  it("maps roster typos and Ft. abbreviations to city centroids", async () => {
    process.env.GEOCODE_PROVIDER = "centroids";
    const ft = await resolveAlumniLocation({
      id: "88888888-8888-4888-8888-888888888888",
      first_name: "Pat",
      last_name: "Hoya",
      preferred_name: null,
      full_name: null,
      position: null,
      class_year: null,
      current_city: "Ft. Lauderdale",
      current_state: "FL",
      hometown_city: null,
      hometown_state: null,
      address_primary: null,
    });
    assert.equal(ft?.method, "city");
    assert.ok(Math.abs((ft?.lat ?? 0) - 26.122438) < 0.001);

    const typo = await resolveAlumniLocation({
      id: "99999999-9999-4999-8999-999999999999",
      first_name: "Pat",
      last_name: "Hoya",
      preferred_name: null,
      full_name: null,
      position: null,
      class_year: null,
      current_city: "Nashvile",
      current_state: "TN",
      hometown_city: null,
      hometown_state: null,
      address_primary: null,
    });
    assert.equal(typo?.method, "city");
    assert.ok(Math.abs((typo?.lat ?? 0) - 36.162663) < 0.001);
  });

  it("places Sanford FL on the city centroid (not a Florida state guess)", async () => {
    process.env.GEOCODE_PROVIDER = "centroids";
    const resolved = await resolveAlumniLocation({
      id: "4a8e19f3-ae74-4f74-8152-8a81038e3ae2",
      first_name: "Lars",
      last_name: "Siegfried",
      preferred_name: null,
      full_name: null,
      position: null,
      class_year: null,
      current_city: "Sanford",
      current_state: "FL",
      hometown_city: "Dublin",
      hometown_state: "OH",
      address_primary: "3985 aviation loop Sanford, FL 32773",
    });
    assert.equal(resolved?.method, "city");
    assert.equal(resolved?.label, "Sanford, FL");
    assert.ok(Math.abs((resolved?.lat ?? 0) - 28.811735) < 0.001);
    assert.ok(Math.abs((resolved?.lng ?? 0) - -81.268022) < 0.001);
  });

  it("places Mike Kasten hometown Freehold NJ on the city centroid", async () => {
    process.env.GEOCODE_PROVIDER = "centroids";
    const resolved = await resolveAlumniLocation({
      id: "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136",
      first_name: "Michael",
      last_name: "Kasten",
      preferred_name: null,
      full_name: null,
      position: null,
      class_year: null,
      current_city: null,
      current_state: null,
      hometown_city: "Freehold",
      hometown_state: "NJ",
      address_primary: null,
    });
    assert.equal(resolved?.method, "city");
    assert.equal(resolved?.label, "Freehold, NJ");
    assert.ok(Math.abs((resolved?.lat ?? 0) - 40.260106) < 0.001);
  });

  it("places Hampton Tanner hometown Fernandina Beach just north of Jacksonville", async () => {
    process.env.GEOCODE_PROVIDER = "centroids";
    const resolved = await resolveAlumniLocations({
      id: "6f7e18a2-89be-447c-a16c-d2d5477abd88",
      first_name: "Hampton",
      last_name: "Tanner",
      preferred_name: "Mr. Hampton McDaniel Tanner",
      full_name: null,
      position: "OL",
      class_year: "2025",
      current_city: "Washington",
      current_state: "DC",
      hometown_city: "Fernandina Beach",
      hometown_state: "FL",
      address_primary: null,
    });
    const hometown = resolved.find((row) => row.source === "hometown");
    assert.equal(hometown?.method, "city");
    assert.equal(hometown?.label, "Fernandina Beach, FL");
    // ~30.67N — Amelia Island, immediately north of Jacksonville (~30.33N)
    assert.ok(Math.abs((hometown?.lat ?? 0) - 30.669682) < 0.001);
    assert.ok(Math.abs((hometown?.lng ?? 0) - -81.462587) < 0.001);
    assert.ok((hometown?.lat ?? 0) > 30.3, "should sit near the Jacksonville metro, not central Florida");
  });

  it("returns both current and hometown pins when both resolve", async () => {
    process.env.GEOCODE_PROVIDER = "centroids";
    const resolved = await resolveAlumniLocations({
      id: "55555555-5555-4555-8555-555555555555",
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
      address_primary: "1 Main, Boston, MA 02108",
    });
    assert.equal(resolved.length, 2);
    assert.deepEqual(
      resolved.map((row) => row.source),
      ["current", "hometown"],
    );
    assert.equal(resolved[0]?.label, "Washington, DC");
    assert.equal(resolved[1]?.label, "Dallas, TX");
  });

  it("falls back to address only when current and hometown are missing", async () => {
    process.env.GEOCODE_PROVIDER = "centroids";
    const resolved = await resolveAlumniLocations({
      id: "66666666-6666-4666-8666-666666666666",
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
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0]?.source, "address");
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
