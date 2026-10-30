import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyMergeToSelectedIds,
  canonicalizeSelectedIds,
  normalizeSelectionIds,
} from "./selection";

const keeper = "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136";
const source = "d88fa54e-e3e2-459e-a989-ff2f739d8c30";
const other = "11111111-1111-1111-1111-111111111111";

describe("selection merge canonicalization", () => {
  it("normalizeSelectionIds drops non-uuids and dedupes", () => {
    assert.deepEqual(normalizeSelectionIds([keeper, ` ${keeper} `, "nope", 1, null]), [keeper]);
  });

  it("applyMergeToSelectedIds replaces source with keeper and dedupes", () => {
    assert.deepEqual(applyMergeToSelectedIds([source, other], source, keeper), [keeper, other]);
    assert.deepEqual(applyMergeToSelectedIds([keeper, source], source, keeper), [keeper]);
    assert.deepEqual(applyMergeToSelectedIds([other], source, keeper), [other]);
  });

  it("canonicalizeSelectedIds remaps merged-away picks onto the surviving person", () => {
    const existing = new Set([keeper, other]);
    const redirects = new Map([[source, keeper]]);
    assert.deepEqual(canonicalizeSelectedIds([source, keeper, other], { existing, redirects }), [
      keeper,
      other,
    ]);
    assert.deepEqual(canonicalizeSelectedIds([source], { existing, redirects }), [keeper]);
  });

  it("canonicalizeSelectedIds drops unknown deleted ids without a merge redirect", () => {
    const ghost = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    assert.deepEqual(
      canonicalizeSelectedIds([ghost, keeper], {
        existing: new Set([keeper]),
        redirects: new Map(),
      }),
      [keeper],
    );
  });

  it("canonicalizeSelectedIds follows multi-hop redirects", () => {
    const mid = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const existing = new Set([keeper]);
    const redirects = new Map([
      [source, mid],
      [mid, keeper],
    ]);
    assert.deepEqual(canonicalizeSelectedIds([source], { existing, redirects }), [keeper]);
  });
});
