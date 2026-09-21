import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidNetId,
  netIdFromEmail,
  normalizeNetId,
  parseAlumniLoginIdentifier,
  prefillNetId,
  readAlumniLoginIdentifier,
} from "./alumni-net-id";

describe("GTown NetID helpers", () => {
  it("normalizes letters+digits and lowercases", () => {
    assert.equal(normalizeNetId("  MAK264  "), "mak264");
    assert.equal(normalizeNetId("abc278"), "abc278");
    assert.equal(isValidNetId("Hoyas15"), true);
  });

  it("extracts NetID from a @georgetown.edu address", () => {
    assert.equal(netIdFromEmail("mak264@georgetown.edu"), "mak264");
    assert.equal(netIdFromEmail("MAK264@Georgetown.EDU"), "mak264");
    assert.equal(prefillNetId("mak264@georgetown.edu"), "mak264");
    assert.equal(normalizeNetId("mak264@georgetown.edu"), "mak264");
  });

  it("does not prefill a non-GU email", () => {
    assert.equal(netIdFromEmail("mak264@gmail.com"), null);
    assert.equal(prefillNetId("kasten.claim.smoke@example.com"), "");
  });

  it("rejects empty or invalid NetIDs", () => {
    assert.equal(isValidNetId(""), false);
    assert.equal(isValidNetId("   "), false);
    assert.equal(isValidNetId("m"), false);
    assert.equal(isValidNetId("thisnetidiswaytoolong123"), false);
    assert.equal(isValidNetId("mak-264"), false);
    assert.equal(isValidNetId("mak.264"), false);
    assert.equal(isValidNetId("mak264@gmail.com"), false);
    assert.throws(() => normalizeNetId(""), /Enter your GTown NetID/);
    assert.throws(() => normalizeNetId("mak264@gmail.com"), /before @georgetown.edu/);
  });

  it("classifies login as email or NetID", () => {
    assert.deepEqual(parseAlumniLoginIdentifier("mak264@georgetown.edu"), {
      kind: "email",
      value: "mak264@georgetown.edu",
    });
    assert.deepEqual(parseAlumniLoginIdentifier("  MAK264  "), { kind: "netId", value: "mak264" });
    assert.deepEqual(parseAlumniLoginIdentifier("Hoyas"), { kind: "netId", value: "hoyas" });
    assert.deepEqual(parseAlumniLoginIdentifier("not an id"), { kind: "invalid" });
    assert.deepEqual(parseAlumniLoginIdentifier(""), { kind: "invalid" });
  });

  it("reads identifier from email, netId, or username fields", () => {
    assert.equal(readAlumniLoginIdentifier({ email: "a@b.com" }), "a@b.com");
    assert.equal(readAlumniLoginIdentifier({ identifier: "mak264", email: "a@b.com" }), "mak264");
    assert.equal(readAlumniLoginIdentifier({ username: "Hoyas" }), "Hoyas");
    assert.equal(readAlumniLoginIdentifier({}), "");
  });
});
