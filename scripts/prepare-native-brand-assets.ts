/**
 * Build Capacitor icon / splash sources from Jack the Bulldog.
 * Source of truth: public/brand/hoya-bulldog.png (website brand mark).
 *
 *   npx tsx scripts/prepare-native-brand-assets.ts
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(process.cwd());
const SOURCE = resolve(ROOT, "public/brand/hoya-bulldog.png");
const ASSETS = resolve(ROOT, "assets");
const WWW_BRAND = resolve(ROOT, "native/www/brand/hoya-bulldog.png");

const GEORGETOWN_BLUE = { r: 4, g: 30, b: 66, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function containOnCanvas(
  size: number,
  pad: number,
  background: { r: number; g: number; b: number; alpha: number },
  dest: string,
) {
  mkdirSync(dirname(dest), { recursive: true });
  const inner = Math.max(1, size - pad * 2);
  const resized = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(dest);
}

async function main() {
  mkdirSync(ASSETS, { recursive: true });
  mkdirSync(dirname(WWW_BRAND), { recursive: true });
  copyFileSync(SOURCE, WWW_BRAND);

  await containOnCanvas(1024, 96, GEORGETOWN_BLUE, resolve(ASSETS, "logo.png"));
  await containOnCanvas(1024, 96, GEORGETOWN_BLUE, resolve(ASSETS, "icon.png"));
  await containOnCanvas(1024, 96, GEORGETOWN_BLUE, resolve(ASSETS, "icon-only.png"));
  await containOnCanvas(1024, 80, TRANSPARENT, resolve(ASSETS, "icon-foreground.png"));
  await containOnCanvas(1024, 0, GEORGETOWN_BLUE, resolve(ASSETS, "icon-background.png"));
  await containOnCanvas(2732, 720, GEORGETOWN_BLUE, resolve(ASSETS, "splash.png"));
  await containOnCanvas(2732, 720, GEORGETOWN_BLUE, resolve(ASSETS, "splash-dark.png"));

  console.log("Wrote Capacitor brand sources from public/brand/hoya-bulldog.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
