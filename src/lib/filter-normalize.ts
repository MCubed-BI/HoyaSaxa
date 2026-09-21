import { cleanDisplay, positionLabel } from "@/lib/format";
import { normalizeState } from "@/lib/us-centroids";

const COUNTRY_TOKENS = new Set([
  "us",
  "usa",
  "u.s",
  "u.s.a",
  "united states",
  "united states of america",
  "america",
]);

const AMBIGUOUS_STATE_NAMES = new Set(["washington", "new york", "indiana", "georgia"]);

/** Safe football roster synonyms — abbreviation is the canonical filter value. */
const POSITION_CANON: Record<string, string> = {
  ol: "OL",
  "offensive line": "OL",
  "offensive lineman": "OL",
  "o line": "OL",
  dl: "DL",
  "defensive line": "DL",
  "defensive lineman": "DL",
  "d line": "DL",
  qb: "QB",
  quarterback: "QB",
  wr: "WR",
  "wide receiver": "WR",
  "wide receivers": "WR",
  rb: "RB",
  "running back": "RB",
  te: "TE",
  "tight end": "TE",
  lb: "LB",
  linebacker: "LB",
  db: "DB",
  "defensive back": "DB",
  cb: "CB",
  cornerback: "CB",
  s: "S",
  safety: "S",
  fs: "FS",
  "free safety": "FS",
  ss: "SS",
  "strong safety": "SS",
  k: "K",
  kicker: "K",
  p: "P",
  punter: "P",
  ls: "LS",
  "long snapper": "LS",
  fb: "FB",
  fullback: "FB",
  c: "C",
  center: "C",
  og: "OG",
  "offensive guard": "OG",
  ot: "OT",
  "offensive tackle": "OT",
  dt: "DT",
  "defensive tackle": "DT",
  de: "DE",
  "defensive end": "DE",
  nt: "NT",
  "nose tackle": "NT",
  ath: "ATH",
  athlete: "ATH",
};

export type FilterAliasMap = Record<string, string[]>;

export type GroupedFilterOptions = {
  options: string[];
  aliases: FilterAliasMap;
};

function titleCaseWords(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s/'()-])([a-z])/g, (_, edge: string, letter: string) => edge + letter.toUpperCase())
    .replace(/\bMc([a-z])/g, (_, letter: string) => `Mc${letter.toUpperCase()}`);
}

function isBareStateCode(value: string) {
  const compact = value.replace(/\./g, "").trim();
  return compact.length === 2 && Boolean(normalizeState(compact));
}

function isCountryToken(value: string) {
  return COUNTRY_TOKENS.has(value.replace(/\./g, "").trim().toLowerCase());
}

function isDroppableStateToken(value: string) {
  if (isBareStateCode(value)) return true;
  if (isCountryToken(value)) return true;
  const named = normalizeState(value);
  if (!named) return false;
  return !AMBIGUOUS_STATE_NAMES.has(value.trim().toLowerCase());
}

function looksLikeStreet(value: string) {
  const text = value.trim();
  if (/^\d/.test(text)) return true;
  return /\d/.test(text) && /\b(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|court|ct|place|pl|parkway|pkwy|highway|hwy|circle|cir|terrace|ter)\b/i.test(text);
}

function stripZip(value: string) {
  return value.replace(/\s+\d{5}(?:-\d{4})?\s*$/i, "").trim();
}

function positionKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeFilterState(value: string | null | undefined): string | null {
  const cleaned = cleanDisplay(value);
  if (!cleaned) return null;

  const direct = normalizeState(cleaned);
  if (direct) return direct;

  if (cleaned.includes(",")) {
    const parts = cleaned
      .split(",")
      .map((part) => stripZip(part.trim()))
      .filter(Boolean);
    while (parts.length && isCountryToken(parts[parts.length - 1]!)) parts.pop();
    const last = parts[parts.length - 1];
    if (last) {
      const fromLast = normalizeState(last);
      if (fromLast) return fromLast;
    }
  }

  const tokens = cleaned.split(/\s*[:|/]+\s*/).map((token) => token.trim()).filter(Boolean);
  const codes = [...new Set(tokens.map((token) => normalizeState(token)).filter((code): code is string => Boolean(code)))];
  if (codes.length === 1) return codes[0] ?? null;
  if (tokens.length > 1) return null;

  if (cleaned.length <= 3) return cleaned.replace(/\./g, "").toUpperCase();
  return titleCaseWords(cleaned);
}

export function normalizeFilterCity(value: string | null | undefined): string | null {
  const cleaned = cleanDisplay(value);
  if (!cleaned) return null;

  const withoutZip = stripZip(cleaned);
  const tokens = withoutZip.split(/[^A-Za-z.]+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => isBareStateCode(token))) return null;
  if (isBareStateCode(withoutZip)) return null;

  let city = withoutZip;

  if (withoutZip.includes(",")) {
    const parts = withoutZip
      .split(",")
      .map((part) => stripZip(part.trim()))
      .filter(Boolean);
    while (parts.length && isDroppableStateToken(parts[parts.length - 1]!)) parts.pop();
    while (parts.length && looksLikeStreet(parts[0]!)) parts.shift();
    city = parts[parts.length - 1] ?? "";
  } else {
    const trailing = withoutZip.match(/^(.*?)[\s]+([A-Za-z.]{2})$/);
    if (trailing && isBareStateCode(trailing[2]!)) {
      city = trailing[1]!.trim();
    }
  }

  city = city.replace(/\s+/g, " ").trim();
  if (!city || isBareStateCode(city) || looksLikeStreet(city)) return null;
  if (normalizeFilterState(city) && city.length <= 3) return null;

  return titleCaseWords(city);
}

export function normalizeFilterPosition(value: string | null | undefined): string | null {
  const cleaned = cleanDisplay(value);
  if (!cleaned) return null;

  const labeled = positionLabel(cleaned);
  if (!labeled) return null;
  if (/[/|,]/.test(cleaned) || labeled.includes(" / ")) return labeled;

  const key = positionKey(labeled);
  const compact = labeled.replace(/[^A-Za-z]/g, "").toLowerCase();
  return POSITION_CANON[key] ?? POSITION_CANON[compact] ?? labeled;
}

export function normalizeFilterClassYear(value: string | null | undefined): string | null {
  return cleanDisplay(value);
}

export function uniqueCanonicalValues(
  values: string[],
  normalize: (value: string | null | undefined) => string | null,
) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const canonical = normalize(value);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
  }
  return out;
}

export function groupFilterOptions(
  raw: string[],
  normalize: (value: string | null | undefined) => string | null,
  sort: "asc" | "desc" = "asc",
): GroupedFilterOptions {
  const grouped = new Map<string, Set<string>>();
  for (const value of raw) {
    const key = normalize(value);
    if (!key) continue;
    const bucket = grouped.get(key) ?? new Set<string>();
    bucket.add(value);
    grouped.set(key, bucket);
  }

  const options = [...grouped.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (sort === "desc") options.reverse();

  return {
    options,
    aliases: Object.fromEntries([...grouped].map(([key, values]) => [key, [...values]])),
  };
}

export function expandFilterSelection(
  selected: string[],
  aliases: FilterAliasMap,
  normalize: (value: string | null | undefined) => string | null,
) {
  const out = new Set<string>();
  for (const value of selected) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    out.add(trimmed);
    const key = normalize(trimmed) ?? trimmed;
    out.add(key);
    for (const alias of aliases[key] ?? []) out.add(alias);
    for (const alias of aliases[trimmed] ?? []) out.add(alias);
  }
  return [...out];
}
