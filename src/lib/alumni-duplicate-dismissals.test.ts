import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dismissedSourceIdSet,
  duplicateDismissalActorKey,
  excludeDismissedById,
  normalizeAlumniPair,
} from "./alumni-duplicate-dismissals";

const keeper = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const source = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("alumni duplicate dismissals", () => {
  it("orders a pair so A/B and B/A are the same key", () => {
    assert.deepEqual(normalizeAlumniPair(keeper, source), [keeper, source]);
    assert.deepEqual(normalizeAlumniPair(source, keeper), [keeper, source]);
  });

  it("rejects the same alumni id twice", () => {
    assert.throws(() => normalizeAlumniPair(keeper, keeper), /two different records/);
  });

  it("prefers claimed account, then session alumni, then admin label", () => {
    assert.equal(
      duplicateDismissalActorKey({
        accountId: "acct-1",
        sessionAlumniId: keeper,
        isAdmin: true,
        label: "Lars",
      }),
      "account:acct-1",
    );
    assert.equal(
      duplicateDismissalActorKey({ sessionAlumniId: keeper, isAdmin: true, label: "Lars" }),
      `alumni:${keeper}`,
    );
    assert.equal(duplicateDismissalActorKey({ isAdmin: true, label: "Lars" }), "admin:lars");
    assert.equal(duplicateDismissalActorKey({ isAdmin: false, label: "Lars" }), null);
    assert.equal(duplicateDismissalActorKey({}), null);
  });

  it("hides the other side of a dismissed pair for that keeper", () => {
    const [low, high] = normalizeAlumniPair(keeper, source);
    const dismissed = dismissedSourceIdSet([{ alumni_id_low: low, alumni_id_high: high }], [keeper]);
    assert.deepEqual(
      excludeDismissedById([{ id: source }, { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }], dismissed).map(
        (row) => row.id,
      ),
      ["cccccccc-cccc-4ccc-8ccc-cccccccccccc"],
    );
    assert.equal(dismissedSourceIdSet([{ alumni_id_low: low, alumni_id_high: high }], [source]).has(keeper), true);
  });
});
