import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAlumSessionToken } from "./alum-session";
import { createAlumniSessionToken } from "./alumni-auth";
import { readAlumniMeSession } from "./alumni-claim";
import { createHoyaAlumSessionToken } from "./hoya-alum-session";
import { canAccessAlumniClaimPath } from "./portal-paths";
import { canEditAlumniRecord } from "./platform-roles";

function jar(entries: Record<string, string>) {
  return {
    get(name: string) {
      const value = entries[name];
      return value ? { value } : undefined;
    },
  };
}

describe("alum /me and own-photo ACL", () => {
  it("lets a claimed hoya_alum_session open /me without ga_session", () => {
    assert.equal(
      canAccessAlumniClaimPath("/me", { hasPortalAlumSession: true, isCoach: false }),
      true,
    );
    assert.equal(
      canAccessAlumniClaimPath("/api/alumni/me", { hasPortalAlumSession: true, isCoach: false }),
      true,
    );
    assert.equal(
      canAccessAlumniClaimPath("/api/alumni/update", { hasPortalAlumSession: true, isCoach: false }),
      true,
    );
    assert.equal(canAccessAlumniClaimPath("/me", { hasPortalAlumSession: false, isCoach: false }), false);
    assert.equal(
      canAccessAlumniClaimPath("/api/alumni/merge", { hasPortalAlumSession: false, isCoach: true }),
      true,
    );
    assert.equal(
      canAccessAlumniClaimPath("/api/alumni/dismiss-duplicate", { hasPortalAlumSession: false, isCoach: true }),
      true,
    );
    assert.equal(
      canAccessAlumniClaimPath("/api/alumni/dismiss-duplicate", { hasPortalAlumSession: true, isCoach: false }),
      true,
    );
    assert.equal(
      canAccessAlumniClaimPath("/api/alumni/update", { hasPortalAlumSession: false, isCoach: true }),
      false,
    );
  });

  it("reads claimed, preview, locker, and legacy claim cookies as alum sessions", () => {
    const claimed = createAlumSessionToken({
      role: "alum",
      alumniId: "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136",
      email: "mike@example.com",
      name: "Mike",
    });
    const claimedSession = readAlumniMeSession(jar({ hoya_alum_session: claimed }));
    assert.equal(claimedSession.hasAlumSession, true);
    assert.equal(claimedSession.alumniId, "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136");
    assert.equal(claimedSession.email, "mike@example.com");

    const preview = createAlumSessionToken({ role: "alum", email: "", name: "Alum" });
    const previewSession = readAlumniMeSession(jar({ hoya_alum_session: preview }));
    assert.equal(previewSession.hasAlumSession, true);
    assert.equal(previewSession.alumniId, null);

    const locker = createHoyaAlumSessionToken("alum", "Alum");
    const lockerSession = readAlumniMeSession(jar({ hoya_alum_session: locker }));
    assert.equal(lockerSession.hasAlumSession, true);
    assert.equal(lockerSession.name, "Alum");

    const legacy = createAlumniSessionToken("acct-1");
    const legacySession = readAlumniMeSession(jar({ ga_alumni_session: legacy }));
    assert.equal(legacySession.hasAlumSession, true);

    assert.equal(readAlumniMeSession(jar({})).hasAlumSession, false);
  });

  it("aligns own-photo save to canEditAlumniRecord — alum self or admin, not staff-only", () => {
    assert.equal(canEditAlumniRecord("alum", "aaa", "aaa"), true);
    assert.equal(canEditAlumniRecord("board", "aaa", "aaa"), true);
    assert.equal(canEditAlumniRecord("alum", "aaa", "bbb"), false);
    assert.equal(canEditAlumniRecord("admin", null, "bbb"), true);
  });
});
