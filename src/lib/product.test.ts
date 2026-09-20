import assert from "node:assert/strict";
import { test } from "node:test";
import { APP_DISPLAY_NAME, PRODUCT_DISPLAY_NAME, PRODUCT_NAME } from "./product";

test("locks the user-facing product name for chrome and metadata", () => {
  assert.equal(PRODUCT_DISPLAY_NAME, "Georgetown Football Alum Network");
  assert.equal(PRODUCT_NAME, PRODUCT_DISPLAY_NAME);
  assert.equal(APP_DISPLAY_NAME, PRODUCT_DISPLAY_NAME);
});
