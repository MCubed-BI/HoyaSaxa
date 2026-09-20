/**
 * GUHoyas football roster scrape + merge into alumni / alumni_roster_years.
 * Used by Data Sync apply so every successful apply re-applies roster years.
 *
 * Env (optional):
 *   GUHOYAS_ROSTER_YEARS_FROM — default earliest archived year that returns a real roster (2003)
 *   GUHOYAS_ROSTER_YEARS_TO   — default current calendar year
 */

export type GuhoyasPlayer = {
  jersey: string | null;
  fullName: string;
  position: string | null;
  academicYear: string | null;
  height: string | null;
  weight: string | null;
  hometownHighSchool: string | null;
  previousSchool: string | null;
  year: number;
  photoUrl: string | null;
};

export type GuhoyasYearRoster = {
  year: number;
  url: string;
  playerCount: number;
  players: GuhoyasPlayer[];
};

export type GuhoyasFetchResult = {
  years: GuhoyasYearRoster[];
  failed: Array<{ year: number; reason: string; url?: string }>;
  from: number;
  to: number;
};

export type GuhoyasPhotoMergeResult = {
  sourced: number;
  matched: number;
  filled: number;
  updated: number;
  unchanged: number;
  unmatched: number;
  ambiguous: number;
};

export type GuhoyasMergeResult = {
  inserted: number;
  updated: number;
  rosterYears: number;
  uniquePlayers: number;
  yearsApplied: number[];
  failed: GuhoyasFetchResult["failed"];
  photos: GuhoyasPhotoMergeResult;
};

export type SqlClient = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

const UA = "Mozilla/5.0 (compatible; GeorgetownAlumBot/1.0; +data-sync)";
const BASE = "https://guhoyas.com/sports/football/roster";
/** First year Sidearm still serves a distinct football roster (pre-2003 redirects to current). */
export const GUHOYAS_EARLIEST_YEAR = 2003;

const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v", "esq", "esq."]);

const STATE_MAP: Record<string, string> = {
  "ala.": "AL", alabama: "AL", alaska: "AK", "ariz.": "AZ", arizona: "AZ",
  "ark.": "AR", arkansas: "AR", "calif.": "CA", california: "CA", "colo.": "CO", colorado: "CO",
  "conn.": "CT", connecticut: "CT", "del.": "DE", delaware: "DE", "d.c.": "DC",
  "district of columbia": "DC", "fla.": "FL", florida: "FL", "ga.": "GA", georgia: "GA",
  hawaii: "HI", idaho: "ID", "ill.": "IL", illinois: "IL", "ind.": "IN", indiana: "IN",
  iowa: "IA", "kan.": "KS", kansas: "KS", "ky.": "KY", kentucky: "KY", "la.": "LA",
  louisiana: "LA", maine: "ME", "md.": "MD", maryland: "MD", "mass.": "MA", massachusetts: "MA",
  "mich.": "MI", michigan: "MI", "minn.": "MN", minnesota: "MN", "miss.": "MS", mississippi: "MS",
  "mo.": "MO", missouri: "MO", "mont.": "MT", montana: "MT", "neb.": "NE", nebraska: "NE",
  "nev.": "NV", nevada: "NV", "n.h.": "NH", "new hampshire": "NH", "n.j.": "NJ", "new jersey": "NJ",
  "n.m.": "NM", "new mexico": "NM", "n.y.": "NY", "new york": "NY", "n.c.": "NC",
  "north carolina": "NC", "n.d.": "ND", "north dakota": "ND", ohio: "OH", "okla.": "OK",
  oklahoma: "OK", "ore.": "OR", oregon: "OR", "pa.": "PA", pennsylvania: "PA", "r.i.": "RI",
  "rhode island": "RI", "s.c.": "SC", "south carolina": "SC", "s.d.": "SD", "south dakota": "SD",
  "tenn.": "TN", tennessee: "TN", texas: "TX", "tex.": "TX", utah: "UT", "vt.": "VT",
  vermont: "VT", "va.": "VA", virginia: "VA", "wash.": "WA", washington: "WA", "w.va.": "WV",
  "west virginia": "WV", "wis.": "WI", wisconsin: "WI", "wyo.": "WY", wyoming: "WY",
};

function clean(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).replace(/\u2060/g, "").replace(/\s+/g, " ").trim();
  if (!text || text === "0" || text === "-" || text.toLowerCase() === "n/a") return null;
  return text;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstToken(name: string | null | undefined) {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

/** Match key: lower(last_name)|lower(first token of first_name) — same as workbook import. */
export function guhoyasMatchKey(lastName: string, firstName: string | null) {
  return `${normalizeName(lastName)}|${normalizeName(firstToken(firstName))}`;
}

const PHOTO_HOSTS = /(^|\.)guhoyas\.com$/i;
const SIDEARM_HOSTS = /(sidearmdev\.com|cloudfront\.net)$/i;

/** Canonical https://guhoyas.com/images/... URL without resize query params. */
export function canonicalizeGuhoyasPhotoUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.replace(/&amp;/g, "&").trim();
  if (!value) return null;
  if (/logo|responsive_2022|site\.png|doubleclick|scorecardresearch|team.?photo/i.test(value)) {
    return null;
  }
  if (value.startsWith("//")) value = `https:${value}`;
  if (value.startsWith("/")) value = `https://guhoyas.com${value}`;
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    url.protocol = "https:";
    const host = url.hostname.replace(/^www\./i, "");
    const inner = url.searchParams.get("url");
    if (inner && SIDEARM_HOSTS.test(host)) {
      return canonicalizeGuhoyasPhotoUrl(inner);
    }
    if (!PHOTO_HOSTS.test(host)) return null;
    if (!/\/images\//i.test(url.pathname)) return null;
    if (!/\.(jpe?g|png|webp|gif)$/i.test(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function isGuhoyasPhotoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /guhoyas\.com\/images\//i.test(url) || /\/images\/\d{4}\/\d{1,2}\/\d{1,2}\//.test(url);
}

/** YYYYMMDD from /images/YYYY/M/D/, else rosterYear * 10000. Higher wins. */
export function photoUrlSortKey(url: string | null | undefined, rosterYear?: number | null): number {
  if (url) {
    const match = url.match(/\/images\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
    if (match) {
      return Number.parseInt(
        `${match[1]}${match[2]!.padStart(2, "0")}${match[3]!.padStart(2, "0")}`,
        10,
      );
    }
  }
  if (rosterYear && rosterYear > 0) return rosterYear * 10_000;
  return 0;
}

/** Fill empty; replace a GUHoyas URL only when the incoming path date/year is newer. Never overwrite custom URLs. */
export function shouldReplaceFootballPhoto(
  existing: string | null | undefined,
  incoming: string,
  incomingYear?: number | null,
  existingYear?: number | null,
): boolean {
  const current = existing?.trim() || null;
  if (!current) return true;
  if (!isGuhoyasPhotoUrl(current)) return false;
  return photoUrlSortKey(incoming, incomingYear) > photoUrlSortKey(current, existingYear);
}

function extractLdImage(image: unknown): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  if (typeof image === "object" && image && "url" in image) {
    const url = (image as { url?: unknown }).url;
    return typeof url === "string" ? url : null;
  }
  return null;
}

function collectLdPeople(node: unknown, out: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const item of node) collectLdPeople(item, out);
    return out;
  }
  if (typeof node !== "object") return out;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  const isPerson = type === "Person" || (Array.isArray(type) && type.includes("Person"));
  if (isPerson) out.push(obj);
  if (obj.item) collectLdPeople(obj.item, out);
  if (obj.itemListElement) collectLdPeople(obj.itemListElement, out);
  return out;
}

export function parseRosterPhotoMap(html: string): Map<string, { fullName: string; photoUrl: string }> {
  const byKey = new Map<string, { fullName: string; photoUrl: string }>();

  const remember = (fullNameRaw: string, rawUrl: string) => {
    const fullName = clean(fullNameRaw);
    const photoUrl = canonicalizeGuhoyasPhotoUrl(rawUrl);
    if (!fullName || !photoUrl) return;
    const { firstName, lastName } = splitFullName(fullName);
    const key = guhoyasMatchKey(lastName, firstName);
    const existing = byKey.get(key);
    if (!existing || photoUrlSortKey(photoUrl) >= photoUrlSortKey(existing.photoUrl)) {
      byKey.set(key, { fullName, photoUrl });
    }
  };

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1] ?? "");
      for (const person of collectLdPeople(data)) {
        const name = typeof person.name === "string" ? person.name : null;
        const imageUrl = extractLdImage(person.image);
        if (name && imageUrl) remember(name, imageUrl);
      }
    } catch {
      // Sidearm sometimes emits adjacent JSON-LD blobs; ignore a bad one.
    }
  }

  for (const match of html.matchAll(
    /<(?:img)[^>]*(?:data-src|src)="([^"]+)"[^>]*alt="([^"]+?)\s*-\s*View Profile"/gi,
  )) {
    remember(match[2] ?? "", match[1] ?? "");
  }
  for (const match of html.matchAll(
    /alt="([^"]+?)\s*-\s*View Profile"[^>]*(?:data-src|src)="([^"]+)"/gi,
  )) {
    remember(match[1] ?? "", match[2] ?? "");
  }

  return byKey;
}

function attachRosterPhotos(players: GuhoyasPlayer[], html: string) {
  const photos = parseRosterPhotoMap(html);
  for (const player of players) {
    if (player.photoUrl) continue;
    const { firstName, lastName } = splitFullName(player.fullName);
    player.photoUrl = photos.get(guhoyasMatchKey(lastName, firstName))?.photoUrl ?? null;
  }
}

export function splitFullName(fullName: string): { firstName: string | null; lastName: string } {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: null, lastName: parts[0]! };
  const last = parts[parts.length - 1]!;
  if (parts.length >= 3 && SUFFIXES.has(last.toLowerCase())) {
    return { firstName: parts.slice(0, -2).join(" "), lastName: parts.slice(-2).join(" ") };
  }
  return { firstName: parts.slice(0, -1).join(" "), lastName: last };
}

export function parseHometownHighSchool(raw: string | null): {
  city: string | null;
  state: string | null;
  highSchool: string | null;
} {
  const text = clean(raw);
  if (!text) return { city: null, state: null, highSchool: null };
  let hometownPart = text;
  let highSchool: string | null = null;
  if (text.includes(" / ")) {
    const [a, b] = text.split(" / ", 2);
    hometownPart = a!;
    highSchool = clean(b);
  } else if (text.includes("/")) {
    const [a, b] = text.split("/", 2);
    hometownPart = a!.trim();
    highSchool = clean(b);
  }
  let city: string | null = null;
  let state: string | null = null;
  if (hometownPart.includes(",")) {
    const idx = hometownPart.lastIndexOf(",");
    city = clean(hometownPart.slice(0, idx));
    const stateRaw = clean(hometownPart.slice(idx + 1));
    if (stateRaw) {
      const key = stateRaw.toLowerCase();
      state = STATE_MAP[key] ?? STATE_MAP[`${key}.`] ?? (stateRaw.length === 2 ? stateRaw.toUpperCase() : stateRaw);
    }
  } else {
    city = clean(hometownPart);
  }
  return { city, state, highSchool };
}

function cellText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function detectPageYear(html: string, finalUrl: string): number | null {
  const heading = html.match(/(\d{4})\s+Football Roster/);
  if (heading) return Number.parseInt(heading[1]!, 10);
  const path = finalUrl.match(/\/roster\/(\d{4})/);
  if (path) return Number.parseInt(path[1]!, 10);
  return null;
}

export function parseRosterHtml(html: string, year: number): GuhoyasPlayer[] {
  const tables = Array.from(html.matchAll(/<table class="sidearm-table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi));
  let target: string | null = null;
  for (const match of tables) {
    const chunk = match[0];
    if (chunk.includes("Full Name") && (chunk.includes("Pos") || chunk.includes("Academic Year"))) {
      target = chunk;
      break;
    }
  }

  const players: GuhoyasPlayer[] = [];
  if (target) {
    const rows = Array.from(target.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
    for (const rowMatch of rows) {
      const row = rowMatch[1] ?? "";
      if (/<th/i.test(row) && /full name/i.test(row)) continue;
      const cells = Array.from(row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((m) => cellText(m[1] ?? ""));
      if (cells.length < 4) continue;
      const fullName = clean(cells[1]);
      if (!fullName || fullName.toLowerCase() === "full name" || fullName.toLowerCase() === "name") continue;
      if (/^\d+$/.test(fullName)) continue;
      players.push({
        jersey: cells[0] && cells[0] !== "-" ? cells[0] : null,
        fullName,
        position: clean(cells[2]),
        academicYear: clean(cells[3]),
        height: clean(cells[4]),
        weight: clean(cells[5]),
        hometownHighSchool: clean(cells[6]),
        previousSchool: clean(cells[7]),
        year,
        photoUrl: null,
      });
    }
    if (players.length > 0) {
      attachRosterPhotos(players, html);
      return players;
    }
  }

  const cardRe =
    /<li class="sidearm-roster-player"[^>]*>[\s\S]*?(?=<li class="sidearm-roster-player"|<\/ul>)/gi;
  for (const match of Array.from(html.matchAll(cardRe))) {
    const block = match[0];
    const jersey = block.match(/sidearm-roster-player-jersey-number[^>]*>\s*([^<]+)/i);
    const name =
      block.match(/aria-label="([^"]+?) - View Profile"/i) ||
      block.match(
        /sidearm-roster-player-name[\s\S]*?<a[^>]*>\s*(?:<span[^>]*>[\s\S]*?<\/span>\s*)?([^<]+)/i,
      );
    const pos =
      block.match(/sidearm-roster-player-position-long-short hide-on-medium[^>]*>\s*([^<]+)/i) ||
      block.match(/sidearm-roster-player-position-long-short hide-on-small-down[^>]*>\s*([^<]+)/i);
    const ht = block.match(/sidearm-roster-player-height[^>]*>\s*([^<]+)/i);
    const wt = block.match(/sidearm-roster-player-weight[^>]*>\s*([^<]+)/i);
    const ay = block.match(/sidearm-roster-player-academic-year[^>]*>\s*([^<]+)/i);
    const home = block.match(/sidearm-roster-player-hometown[^>]*>\s*([^<]+)/i);
    const hs = block.match(/sidearm-roster-player-highschool[^>]*>\s*([^<]+)/i);
    const prev = block.match(/sidearm-roster-player-previous-school[^>]*>\s*([^<]+)/i);
    const img =
      block.match(/<(?:img)[^>]*(?:data-src|src)="([^"]+)"/i) ||
      block.match(/(?:data-src|src)="([^"]+\/images\/[^"]+)"/i);
    const fullName = clean(name?.[1]);
    if (!fullName) continue;
    const hometown = clean(home?.[1]);
    const highSchool = clean(hs?.[1]);
    const hometownHighSchool = [hometown, highSchool].filter(Boolean).join(" / ") || null;
    players.push({
      jersey: jersey?.[1]?.trim() && jersey[1].trim() !== "-" ? jersey[1].trim() : null,
      fullName,
      position: clean(pos?.[1]),
      academicYear: clean(ay?.[1]),
      height: clean(ht?.[1]),
      weight: clean(wt?.[1]),
      hometownHighSchool,
      previousSchool: clean(prev?.[1]),
      year,
      photoUrl: canonicalizeGuhoyasPhotoUrl(img?.[1] ?? null),
    });
  }
  attachRosterPhotos(players, html);
  return players;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchYearHtml(url: string): Promise<{ status: number; html: string; finalUrl: string } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        redirect: "follow",
        cache: "no-store",
      });
      const html = await res.text();
      return { status: res.status, html, finalUrl: res.url };
    } catch {
      if (attempt === 0) await sleep(800);
    }
  }
  return null;
}

export function resolveYearRange(from?: number, to?: number) {
  const current = new Date().getFullYear();
  const envFrom = Number.parseInt(process.env.GUHOYAS_ROSTER_YEARS_FROM ?? "", 10);
  const envTo = Number.parseInt(process.env.GUHOYAS_ROSTER_YEARS_TO ?? "", 10);
  const start = from ?? (Number.isFinite(envFrom) ? envFrom : GUHOYAS_EARLIEST_YEAR);
  const end = to ?? (Number.isFinite(envTo) ? envTo : current);
  return { from: Math.min(start, end), to: Math.max(start, end) };
}

export async function fetchGuhoyasRosters(options?: {
  from?: number;
  to?: number;
  delayMs?: number;
}): Promise<GuhoyasFetchResult> {
  const { from, to } = resolveYearRange(options?.from, options?.to);
  const delayMs = options?.delayMs ?? 350;
  const years: GuhoyasYearRoster[] = [];
  const failed: GuhoyasFetchResult["failed"] = [];

  for (let year = from; year <= to; year++) {
    const url = `${BASE}/${year}`;
    const resp = await fetchYearHtml(url);
    if (year < to) await sleep(delayMs);
    if (!resp) {
      failed.push({ year, reason: "fetch_error", url });
      continue;
    }
    if (resp.status === 404 || /Page Not Found/i.test(resp.html)) {
      failed.push({ year, reason: "404", url });
      continue;
    }
    const detected = detectPageYear(resp.html, resp.finalUrl);
    if (detected != null && detected !== year) {
      failed.push({ year, reason: `redirected_to_${detected}`, url });
      continue;
    }
    const players = parseRosterHtml(resp.html, year);
    if (players.length === 0) {
      failed.push({ year, reason: "empty_roster", url });
      continue;
    }
    years.push({ year, url: resp.finalUrl || url, playerCount: players.length, players });
  }

  return { years, failed, from, to };
}

type AggPlayer = {
  firstName: string | null;
  lastName: string;
  fullName: string;
  position: string | null;
  hometownCity: string | null;
  hometownState: string | null;
  latestYear: number;
  years: number[];
  rosterYears: Array<{ year: number; position: string | null; className: string | null }>;
  photoUrl: string | null;
  photoYear: number | null;
};

export function aggregateRosterPlayers(yearRosters: GuhoyasYearRoster[]): Map<string, AggPlayer> {
  const byKey = new Map<string, AggPlayer>();
  for (const blob of yearRosters) {
    for (const p of blob.players) {
      const { firstName, lastName } = splitFullName(p.fullName);
      const key = guhoyasMatchKey(lastName, firstName);
      const { city, state } = parseHometownHighSchool(p.hometownHighSchool);
      const rosterRow = {
        year: blob.year,
        position: p.position,
        className: p.academicYear,
      };
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          firstName,
          lastName,
          fullName: p.fullName,
          position: p.position,
          hometownCity: city,
          hometownState: state,
          latestYear: blob.year,
          years: [blob.year],
          rosterYears: [rosterRow],
          photoUrl: p.photoUrl,
          photoYear: p.photoUrl ? blob.year : null,
        });
        continue;
      }
      if (!existing.years.includes(blob.year)) existing.years.push(blob.year);
      const prior = existing.rosterYears.find((r) => r.year === blob.year);
      if (prior) {
        if (p.position) prior.position = p.position;
        if (p.academicYear) prior.className = p.academicYear;
      } else {
        existing.rosterYears.push(rosterRow);
      }
      if (blob.year >= existing.latestYear) {
        existing.latestYear = blob.year;
        if (p.position) existing.position = p.position;
        if (city) existing.hometownCity = city;
        if (state) existing.hometownState = state;
        existing.fullName = p.fullName;
        existing.firstName = firstName;
        existing.lastName = lastName;
      }
      if (
        p.photoUrl &&
        shouldReplaceFootballPhoto(existing.photoUrl, p.photoUrl, blob.year, existing.photoYear)
      ) {
        existing.photoUrl = p.photoUrl;
        existing.photoYear = blob.year;
      }
    }
  }
  for (const player of Array.from(byKey.values())) {
    player.years = Array.from(new Set(player.years)).sort((a, b) => a - b);
    player.rosterYears.sort((a, b) => a.year - b.year);
  }
  return byKey;
}

type ExistingRow = {
  id: string;
  first_name: string | null;
  last_name: string;
  source_flags: Record<string, unknown> | null;
};

function asFlags(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mergeYearLists(a: unknown, b: number[]): number[] {
  const left = Array.isArray(a) ? a.filter((x): x is number => typeof x === "number") : [];
  return Array.from(new Set([...left, ...b])).sort((x, y) => x - y);
}

const EMPTY_PHOTO_MERGE: GuhoyasPhotoMergeResult = {
  sourced: 0,
  matched: 0,
  filled: 0,
  updated: 0,
  unchanged: 0,
  unmatched: 0,
  ambiguous: 0,
};

type PhotoExistingRow = {
  id: string;
  first_name: string | null;
  last_name: string;
  football_photo_url: string | null;
  source_flags: Record<string, unknown> | null;
};

function photoYearFromFlags(flags: Record<string, unknown> | null): number | null {
  const raw = flags?.guhoyas_photo_year;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

/** Match farmed GUHoyas headshots onto alumni.football_photo_url. Never writes linkedin_photo_url. */
export async function mergeFootballPhotosIntoAlumni(
  sql: SqlClient,
  yearRosters: GuhoyasYearRoster[],
): Promise<GuhoyasPhotoMergeResult> {
  const byKey = aggregateRosterPlayers(yearRosters);
  const sourced = Array.from(byKey.values()).filter((player) => player.photoUrl);
  if (sourced.length === 0) return { ...EMPTY_PHOTO_MERGE };

  await sql.query(`ALTER TABLE alumni ADD COLUMN IF NOT EXISTS football_photo_url text`);

  const existingRows = (await sql.query(
    `SELECT id, first_name, last_name, football_photo_url, source_flags FROM alumni`,
  )) as PhotoExistingRow[];

  const existingByKey = new Map<string, PhotoExistingRow[]>();
  for (const row of existingRows) {
    const key = guhoyasMatchKey(row.last_name, row.first_name);
    const list = existingByKey.get(key) ?? [];
    list.push(row);
    existingByKey.set(key, list);
  }

  const counts: GuhoyasPhotoMergeResult = { ...EMPTY_PHOTO_MERGE, sourced: sourced.length };

  for (const player of sourced) {
    const key = guhoyasMatchKey(player.lastName, player.firstName);
    const matches = existingByKey.get(key) ?? [];
    if (matches.length === 0) {
      counts.unmatched += 1;
      continue;
    }
    counts.matched += 1;
    if (matches.length > 1) counts.ambiguous += 1;
    const row = matches[0]!;
    const incoming = player.photoUrl!;
    const existingUrl = row.football_photo_url;
    if (!shouldReplaceFootballPhoto(existingUrl, incoming, player.photoYear, photoYearFromFlags(asFlags(row.source_flags)))) {
      counts.unchanged += 1;
      continue;
    }
    const filled = !existingUrl?.trim();
    const flags = {
      ...asFlags(row.source_flags),
      guhoyas_photo: true,
      guhoyas_photo_year: player.photoYear ?? player.latestYear,
    };
    await sql.query(
      `UPDATE alumni SET
         football_photo_url = $1,
         source_flags = COALESCE(source_flags, '{}'::jsonb) || $2::jsonb,
         updated_at = now()
       WHERE id = $3`,
      [incoming, JSON.stringify(flags), row.id],
    );
    row.football_photo_url = incoming;
    row.source_flags = flags;
    if (filled) counts.filled += 1;
    else counts.updated += 1;
  }

  return counts;
}

/** Upsert scraped roster players into alumni + alumni_roster_years. Does not touch emails/phones/linkedin. */
export async function mergeRostersIntoAlumni(
  sql: SqlClient,
  yearRosters: GuhoyasYearRoster[],
): Promise<Omit<GuhoyasMergeResult, "failed" | "photos">> {
  const byKey = aggregateRosterPlayers(yearRosters);
  if (byKey.size === 0) {
    return { inserted: 0, updated: 0, rosterYears: 0, uniquePlayers: 0, yearsApplied: [] };
  }

  const existingRows = (await sql.query(
    `SELECT id, first_name, last_name, source_flags FROM alumni`,
  )) as ExistingRow[];

  const existingByKey = new Map<string, ExistingRow[]>();
  for (const row of existingRows) {
    const key = guhoyasMatchKey(row.last_name, row.first_name);
    const list = existingByKey.get(key) ?? [];
    list.push(row);
    existingByKey.set(key, list);
  }

  let inserted = 0;
  let updated = 0;
  let rosterYears = 0;
  const yearsApplied = Array.from(new Set(yearRosters.map((y) => y.year))).sort((a, b) => a - b);

  for (const [, player] of Array.from(byKey.entries())) {
    const key = guhoyasMatchKey(player.lastName, player.firstName);
    const matches = existingByKey.get(key) ?? [];
    let alumniId: string;

    if (matches.length > 0) {
      const row = matches[0]!;
      alumniId = row.id;
      const oldFlags = asFlags(row.source_flags);
      const mergedFlags = {
        ...oldFlags,
        guhoyas_roster: true,
        guhoyas_years: mergeYearLists(oldFlags.guhoyas_years, player.years),
      };
      // Prefer latest roster position; fill hometown only when blank; never invent class_year.
      await sql.query(
        `UPDATE alumni SET
           first_name = COALESCE($1, first_name),
           full_name = COALESCE($2, full_name),
           position = COALESCE($3, position),
           hometown_city = COALESCE(hometown_city, $4),
           hometown_state = COALESCE(hometown_state, $5),
           source_flags = COALESCE(source_flags, '{}'::jsonb) || $6::jsonb,
           updated_at = now()
         WHERE id = $7`,
        [
          player.firstName,
          player.fullName,
          player.position,
          player.hometownCity,
          player.hometownState,
          JSON.stringify(mergedFlags),
          alumniId,
        ],
      );
      if (player.position) {
        await sql.query(`UPDATE alumni SET position = $1, updated_at = now() WHERE id = $2`, [
          player.position,
          alumniId,
        ]);
      }
      updated += 1;
    } else {
      const flags = { guhoyas_roster: true, guhoyas_years: player.years };
      const rows = (await sql.query(
        `INSERT INTO alumni (
           first_name, last_name, full_name, position,
           hometown_city, hometown_state, source_flags
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
         RETURNING id`,
        [
          player.firstName,
          player.lastName,
          player.fullName,
          player.position,
          player.hometownCity,
          player.hometownState,
          JSON.stringify(flags),
        ],
      )) as Array<{ id: string }>;
      alumniId = rows[0]!.id;
      const list = existingByKey.get(key) ?? [];
      list.push({
        id: alumniId,
        first_name: player.firstName,
        last_name: player.lastName,
        source_flags: flags,
      });
      existingByKey.set(key, list);
      inserted += 1;
    }

    for (const ry of player.rosterYears) {
      await sql.query(
        `INSERT INTO alumni_roster_years (alumni_id, year, position, class)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (alumni_id, year) DO UPDATE SET
           position = COALESCE(EXCLUDED.position, alumni_roster_years.position),
           class = COALESCE(EXCLUDED.class, alumni_roster_years.class)`,
        [alumniId, ry.year, ry.position, ry.className],
      );
      rosterYears += 1;
    }
  }

  return {
    inserted,
    updated,
    rosterYears,
    uniquePlayers: byKey.size,
    yearsApplied,
  };
}

/** Fetch year range then merge roster rows and football headshots. Safe after Data Sync apply. */
export async function fetchAndMergeGuhoyasRosters(
  sql: SqlClient,
  options?: { from?: number; to?: number; delayMs?: number },
): Promise<GuhoyasMergeResult> {
  const fetched = await fetchGuhoyasRosters(options);
  if (fetched.years.length === 0) {
    return {
      inserted: 0,
      updated: 0,
      rosterYears: 0,
      uniquePlayers: 0,
      yearsApplied: [],
      failed: fetched.failed,
      photos: { ...EMPTY_PHOTO_MERGE },
    };
  }
  const merged = await mergeRostersIntoAlumni(sql, fetched.years);
  const photos = await mergeFootballPhotosIntoAlumni(sql, fetched.years);
  return { ...merged, failed: fetched.failed, photos };
}

/** Fetch year range and write football_photo_url only. Does not insert alumni or touch LinkedIn. */
export async function fetchAndMergeGuhoyasPhotos(
  sql: SqlClient,
  options?: { from?: number; to?: number; delayMs?: number },
): Promise<{ photos: GuhoyasPhotoMergeResult; failed: GuhoyasFetchResult["failed"]; from: number; to: number }> {
  const fetched = await fetchGuhoyasRosters(options);
  if (fetched.years.length === 0) {
    return { photos: { ...EMPTY_PHOTO_MERGE }, failed: fetched.failed, from: fetched.from, to: fetched.to };
  }
  const photos = await mergeFootballPhotosIntoAlumni(sql, fetched.years);
  return { photos, failed: fetched.failed, from: fetched.from, to: fetched.to };
}
