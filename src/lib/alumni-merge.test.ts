import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("mergeAlumniPair SQL", () => {
  const source = readFileSync(join(process.cwd(), "src/lib/alumni-claim.ts"), "utf8");
  const mergeBody = source.slice(source.indexOf("export async function mergeAlumniPair"));
  const decideBody = readFileSync(join(process.cwd(), "src/lib/data-cleanup.ts"), "utf8");

  it("keeps event check-in attendee_key text separate from alumni_id uuid params", () => {
    assert.match(mergeBody, /attendee_key = 'alum:' \|\| \$3/);
    assert.doesNotMatch(
      mergeBody,
      /attendee_key = 'alum:' \|\| \$1(?:::text)?/,
    );
  });

  it("dedupes merged alumni_emails before insert to avoid unique collisions", () => {
    assert.match(mergeBody, /DISTINCT ON \(lower\(email\)\)/);
    assert.match(mergeBody, /ON CONFLICT \(alumni_id, lower\(email\)\) DO NOTHING/);
  });

  it("runs merge writes in a Neon HTTP transaction", () => {
    assert.match(mergeBody, /sql\.transaction\(/);
  });

  it("moves pledges, CRM notes, and push recipients onto the keeper", () => {
    assert.match(mergeBody, /UPDATE fundraising_pledges SET alumni_id/);
    assert.match(mergeBody, /UPDATE giving_pledges SET alumni_id/);
    assert.match(mergeBody, /UPDATE push_blast_recipients SET alumni_id/);
    assert.match(mergeBody, /UPDATE alumni_crm_notes SET alumni_id/);
    assert.match(mergeBody, /UPDATE contact_notes SET alumni_id/);
  });

  it("auto-closes pending cleanup suggestions for a merged-away source", () => {
    assert.match(decideBody, /Auto-closed: related record was merged/);
  });
});
