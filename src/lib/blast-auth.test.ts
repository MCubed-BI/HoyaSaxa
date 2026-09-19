import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alumEmailBlastRejection, blastActorFromRole, normalizeBlastIds } from "./blast-auth";
import { ALUM_EMAIL_SEND_LIMIT, buildGmailComposeLink } from "./email";
import { canUseAlumEmailBlast, canUseBlast } from "./roles";

describe("alum email blast scope", () => {
  it("keeps unlimited blast staff-only and selected email alum/board-only", () => {
    assert.equal(canUseBlast("alum"), false);
    assert.equal(canUseBlast("board"), false);
    assert.equal(canUseAlumEmailBlast("alum"), true);
    assert.equal(canUseAlumEmailBlast("board"), true);
    assert.equal(canUseAlumEmailBlast("coach"), false);
    assert.equal(blastActorFromRole("alum", "Pat")?.kind, "alum");
    assert.equal(blastActorFromRole("coach", "Hoyas")?.kind, "staff");
  });

  it("rejects Twilio, filter groups, and empty pick lists", () => {
    assert.match(
      alumEmailBlastRejection({ channel: "sms", includeIds: true, ids: ["a"] }) ?? "",
      /email only/i,
    );
    assert.match(
      alumEmailBlastRejection({ channel: "email", includeFilters: true, includeIds: true, ids: ["a"] }) ?? "",
      /selected directory picks/i,
    );
    assert.match(
      alumEmailBlastRejection({ channel: "email", includeIds: false, ids: [] }) ?? "",
      /Select classmates/i,
    );
    assert.equal(
      alumEmailBlastRejection({ channel: "email", includeIds: true, ids: [] }, { preview: true }),
      null,
    );
    assert.equal(
      alumEmailBlastRejection({ channel: "email", includeIds: true, ids: ["11111111-1111-1111-1111-111111111111"] }),
      null,
    );
  });

  it("caps alum pick lists and builds a Gmail compose URL", () => {
    const tooMany = Array.from({ length: ALUM_EMAIL_SEND_LIMIT + 1 }, (_, i) => String(i));
    assert.match(alumEmailBlastRejection({ channel: "email", includeIds: true, ids: tooMany }) ?? "", /at most/);
    assert.deepEqual(normalizeBlastIds([" a ", "a", 1, "b"]), ["a", "b"]);
    const gmail = buildGmailComposeLink(["pat@example.com"], "Hoyas", "See you Saturday");
    assert.match(gmail, /^https:\/\/mail\.google\.com\/mail\/\?/);
    assert.match(gmail, /to=pat%40example.com/);
    assert.match(gmail, /su=Hoyas/);
  });
});
