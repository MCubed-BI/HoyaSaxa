import assert from "node:assert/strict";
import { test } from "node:test";
import {
  directoryProfileHref,
  isStrongSingleMatch,
  nameMatchScore,
  suggestFromAlumniRows,
  suggestFromLockerStubs,
} from "./directory-search";

const barnes = {
  id: "barnes-1",
  first_name: "Tim",
  last_name: "Barnes",
  preferred_name: "Tim",
  full_name: "Timothy Barnes",
  position: "LB",
  seasons: "2011-2014",
  class_year: "2015",
  hometown_city: null,
  hometown_state: null,
  current_city: "Washington",
  current_state: "DC",
  company_name: null,
  job_title: null,
  industry: null,
  linkedin_url: null,
  headline: null,
  email_primary: null,
  phone_primary: null,
  address_primary: null,
};

const finnegan = {
  ...barnes,
  id: "finnegan-1",
  first_name: "Pat",
  last_name: "Finnegan",
  preferred_name: "Patty",
  full_name: "Patrick Finnegan",
  position: "WR",
};

test("scores last name and preferred name matches ahead of loose contains", () => {
  assert.ok(nameMatchScore(barnes, "Barnes") > nameMatchScore(barnes, "arn"));
  assert.ok(nameMatchScore(finnegan, "Finnegan") >= 90);
  assert.ok(nameMatchScore(finnegan, "Patty") >= 90);
  assert.ok(nameMatchScore(finnegan, "Patrick Finnegan") >= 80);
  assert.equal(nameMatchScore(barnes, "zzzz"), 0);
});

test("suggests one person for a unique last name", () => {
  const hits = suggestFromAlumniRows([barnes, finnegan], "Finnegan", "admin");
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.id, "finnegan-1");
  assert.equal(hits[0]?.href, "/alumni/finnegan-1");
  assert.equal(directoryProfileHref("finnegan-1", "alum"), "/athletes/finnegan-1");
  assert.equal(isStrongSingleMatch(hits), true);
});

test("locker stubs can be found by name when the roster is offline", () => {
  const hits = suggestFromLockerStubs("Sgarlata");
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.name, "Rob Sgarlata");
  assert.equal(hits[0]?.href, "/athletes/locker-coach-sgarlata");
});
