import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("mergeAlumniPair SQL", () => {
  const source = readFileSync(join(process.cwd(), "src/lib/alumni-claim.ts"), "utf8");
  const mergeBody = source.slice(source.indexOf("export async function mergeAlumniPair"));

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
});
