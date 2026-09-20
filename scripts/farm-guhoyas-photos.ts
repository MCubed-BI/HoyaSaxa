/**
 * One-off / ops re-run: farm public GUHoyas football headshots into
 * alumni.football_photo_url. Does not scrape LinkedIn and does not write
 * linkedin_photo_url.
 *
 * Data Sync → Apply also runs this after a successful workbook apply.
 *
 *   npm run farm-photos
 *   npm run farm-photos -- --from 2024 --to 2026
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { ensureAlumniPhotoColumns } from "../src/lib/alumni-photos";
import { fetchAndMergeGuhoyasPhotos } from "../src/lib/guhoyas-roster";

config({ path: ".env.local" });
config();

function argNum(flag: string): number | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  const value = Number.parseInt(process.argv[index + 1] ?? "", 10);
  return Number.isFinite(value) ? value : undefined;
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  }
  const sql = neon(url);
  await ensureAlumniPhotoColumns();
  const from = argNum("--from");
  const to = argNum("--to");
  const result = await fetchAndMergeGuhoyasPhotos(sql, { from, to, delayMs: 400 });
  console.log(
    JSON.stringify(
      {
        years: { from: result.from, to: result.to },
        failed: result.failed,
        photos: result.photos,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
