import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  firstValidE164,
  isLikelyLandlineE164,
  pickSmsPhone,
  toE164,
} from "./phone";

describe("toE164", () => {
  it("normalizes US 10-digit and 11-digit numbers", () => {
    assert.equal(toE164("(202) 555-0100"), "+12025550100");
    assert.equal(toE164("2025550100"), "+12025550100");
    assert.equal(toE164("1-202-555-0100"), "+12025550100");
    assert.equal(toE164("+12025550100"), "+12025550100");
  });

  it("rejects short or empty values", () => {
    assert.equal(toE164("555-0100"), null);
    assert.equal(toE164(""), null);
    assert.equal(toE164("abc"), null);
  });
});

describe("firstValidE164", () => {
  it("extracts the first valid number from dirty spreadsheet leftovers", () => {
    assert.equal(firstValidE164("8174015075 ::: 202.662.9287 ::: +1 202-687-2748"), "+18174015075");
    assert.equal(firstValidE164("9179219352, 212-526-7072"), "+19179219352");
  });

  it("still handles clean values", () => {
    assert.equal(firstValidE164("(570) 337-8640"), "+15703378640");
  });
});

describe("pickSmsPhone", () => {
  it("prefers labeled Mobile over phone_primary / Work", () => {
    const picked = pickSmsPhone([
      { phone: "212-357-8668", label: null },
      { phone: "(570) 337-8640", label: "Mobile" },
      { phone: "212-555-0100", label: "Work" },
    ]);
    assert.equal(picked?.phone, "+15703378640");
    assert.equal(picked?.kind, "mobile");
    assert.equal(picked?.likelyLandline, false);
  });

  it("skips fax and marks Work-only as likely landline", () => {
    const picked = pickSmsPhone([
      { phone: "202-555-0199", label: "Work Fax" },
      { phone: "202-555-0100", label: "Work" },
    ]);
    assert.equal(picked?.phone, "+12025550100");
    assert.equal(picked?.kind, "work");
    assert.equal(picked?.likelyLandline, true);
  });

  it("flags Georgetown campus office exchanges as landlines", () => {
    const picked = pickSmsPhone([{ phone: "202-784-8417", label: null }]);
    assert.equal(picked?.phone, "+12027848417");
    assert.equal(picked?.likelyLandline, true);
    assert.equal(isLikelyLandlineE164("+12026872734"), true);
  });

  it("prefers a real mobile when primary is a campus office line", () => {
    const picked = pickSmsPhone([
      { phone: "202-687-2734", label: null },
      { phone: "434-981-7790", label: "Mobile" },
    ]);
    assert.equal(picked?.phone, "+14349817790");
    assert.equal(picked?.likelyLandline, false);
  });
});
