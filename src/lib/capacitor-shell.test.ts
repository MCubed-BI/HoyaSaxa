import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  CAP_APP_ID,
  CAP_APP_NAME,
  CAP_URL_SCHEME,
  DEFAULT_CAP_SERVER_URL,
  resolveCapServerUrl,
} from "../../capacitor.config";
import { PRODUCT_DISPLAY_NAME } from "./product";

test("native shell wraps the live site, not a Next static export", () => {
  assert.equal(CAP_APP_ID, "com.nipseytech.georgetownfootballalum");
  assert.equal(CAP_APP_NAME, PRODUCT_DISPLAY_NAME);
  assert.equal(DEFAULT_CAP_SERVER_URL, "https://georgetown-alum.vercel.app");
  assert.equal(CAP_URL_SCHEME, "hoyasaxa");
  assert.equal(resolveCapServerUrl({}), DEFAULT_CAP_SERVER_URL);
  assert.equal(
    resolveCapServerUrl({ CAP_SERVER_URL: " https://preview.example.com " }),
    "https://preview.example.com",
  );

  const nextConfig = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
  assert.equal(nextConfig.includes("output:"), false);

  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  assert.equal(pkg.scripts["cap:sync"], "cap sync");
  assert.equal(pkg.scripts["cap:open:ios"], "cap open ios");
  assert.equal(pkg.scripts["cap:open:android"], "cap open android");
  assert.equal(pkg.scripts.build, "next build");

  assert.equal(existsSync(resolve(process.cwd(), "native/www/index.html")), true);
  assert.equal(existsSync(resolve(process.cwd(), "native/www/offline.html")), true);
  assert.equal(existsSync(resolve(process.cwd(), "public/brand/hoya-bulldog.png")), true);

  const infoPlist = readFileSync(resolve(process.cwd(), "ios/App/App/Info.plist"), "utf8");
  assert.match(infoPlist, /hoyasaxa/);
  assert.match(infoPlist, /NSCameraUsageDescription/);
  assert.match(infoPlist, /NSPhotoLibraryUsageDescription/);

  const manifest = readFileSync(resolve(process.cwd(), "android/app/src/main/AndroidManifest.xml"), "utf8");
  assert.match(manifest, /android:scheme="hoyasaxa"/);
  assert.match(manifest, /android.permission.CAMERA/);
  assert.match(manifest, /android.permission.READ_MEDIA_IMAGES/);
});
