import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  APP_DISPLAY_NAME,
  BRAND_MARK_SRC,
  PRODUCT_DISPLAY_NAME,
  PRODUCT_NAME,
} from "./product";

test("locks the user-facing product name for chrome and metadata", () => {
  assert.equal(PRODUCT_DISPLAY_NAME, "Georgetown Football Alum Network");
  assert.equal(PRODUCT_NAME, PRODUCT_DISPLAY_NAME);
  assert.equal(APP_DISPLAY_NAME, PRODUCT_DISPLAY_NAME);
  assert.equal(["Georgetown Football", "Alum Network"].join(" "), PRODUCT_DISPLAY_NAME);
});

test("locks the public bulldog mark path for chrome and favicon", () => {
  assert.equal(BRAND_MARK_SRC, "/brand/hoya-bulldog.png");
  assert.equal(existsSync(resolve(process.cwd(), "public/brand/hoya-bulldog.png")), true);
  assert.equal(existsSync(resolve(process.cwd(), "src/app/icon.png")), true);
  assert.equal(existsSync(resolve(process.cwd(), "src/app/apple-icon.png")), true);
});
