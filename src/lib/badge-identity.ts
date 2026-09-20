/**
 * Resolve pledge labels and attendance feed rows to a roster alumni id.
 * Used by donor / Top Tailgate loaders. Never writes event_checkins.
 */
import {
  givenNameTokens,
  givenNamesEquivalent,
  isLikelyDuplicate,
  lastNamesMatch,
  type DuplicateNameFields,
} from "@/lib/alumni-duplicates";
import { isAlumniUuid, normalizeAlumniId, resolveFeedAlumId } from "@/lib/badge-event-feed";
import { getDatabaseUrl, getSql } from "@/lib/db";
import { SEED_ADMINS, SEED_ADMIN_ALUMNI_ID } from "@/lib/platform-roles";

export type AlumniIdentity = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  full_name: string | null;
};

const ANON = /^(anonymous|anon|unknown|n\/a|na|none|-)$/i;

function uniqueLower(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

const MIKE_LABELS = uniqueLower([...SEED_ADMINS.mike.names, ...SEED_ADMINS.mike.usernames]);
const SGARLATA_LABELS = uniqueLower([...SEED_ADMINS.sgarlata.names, ...SEED_ADMINS.sgarlata.usernames]);

export function parsePersonName(label: string): DuplicateNameFields {
  const cleaned = label.replace(/\s+/g, " ").trim();
  if (!cleaned || ANON.test(cleaned)) return {};
  if (cleaned.includes(",")) {
    const [last, ...rest] = cleaned.split(",");
    const given = rest.join(" ").trim();
    return {
      first_name: given || null,
      last_name: last?.trim() || null,
      full_name: given && last ? `${given.trim()} ${last.trim()}` : cleaned,
    };
  }
  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return { first_name: parts[0], preferred_name: parts[0], full_name: parts[0] };
  }
  return {
    first_name: parts[0],
    last_name: parts[parts.length - 1],
    full_name: cleaned,
  };
}

/** Seed usernames / known labels (Mike → claimed Kasten roster id). */
export function seedAlumniIdForLabel(label: string): string | null {
  const value = label.trim().toLowerCase();
  if (!value) return null;
  if (MIKE_LABELS.includes(value)) return SEED_ADMIN_ALUMNI_ID;
  return null;
}

function sgarlataMatch(alumni: AlumniIdentity[]) {
  const named = alumni.filter((row) => lastNamesMatch(row.last_name, "Sgarlata"));
  if (named.length === 1) return normalizeAlumniId(named[0]!.id);
  const rob = named.filter((row) =>
    givenNamesEquivalent(givenNameTokens(row), givenNameTokens({ first_name: "Rob", last_name: "Sgarlata" })),
  );
  return rob.length === 1 ? normalizeAlumniId(rob[0]!.id) : "";
}

export function resolveAlumniIdFromLabel(label: string, alumni: AlumniIdentity[] = []): string {
  const text = label.trim();
  if (!text || ANON.test(text)) return "";
  const seeded = seedAlumniIdForLabel(text);
  if (seeded) return seeded;
  if (SGARLATA_LABELS.includes(text.toLowerCase())) {
    return sgarlataMatch(alumni);
  }
  if (isAlumniUuid(text)) return normalizeAlumniId(text);

  const parsed = parsePersonName(text);
  if (!parsed.full_name && !parsed.first_name && !parsed.last_name) return "";

  const exact = text.toLowerCase();
  const matches = alumni.flatMap((row) => {
    const id = normalizeAlumniId(row.id);
    if (!id) return [];
    const names = [
      row.full_name,
      row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
      row.preferred_name && row.last_name ? `${row.preferred_name} ${row.last_name}` : null,
    ]
      .map((name) => name?.replace(/\s+/g, " ").trim().toLowerCase())
      .filter(Boolean);
    if (names.includes(exact)) return [id];
    if (parsed.last_name && isLikelyDuplicate(parsed, row)) return [id];
    return [];
  });
  const unique = [...new Set(matches)];
  return unique.length === 1 ? unique[0]! : "";
}

export function resolveAttendanceAlumId(
  row: {
    alumId?: string | null;
    userId?: string | null;
    personKey?: string | null;
    displayName?: string | null;
  },
  alumni: AlumniIdentity[] = [],
) {
  const fromFeed = resolveFeedAlumId(row);
  if (fromFeed) return fromFeed;
  const candidates = [
    row.displayName,
    row.userId,
    row.personKey?.replace(/^(alum|user):/i, ""),
  ];
  for (const value of candidates) {
    const id = resolveAlumniIdFromLabel(value ?? "", alumni);
    if (id) return id;
  }
  return "";
}

export async function loadAlumniNameIndex(): Promise<AlumniIdentity[]> {
  if (!getDatabaseUrl()) return [];
  const sql = getSql();
  const rows = (await sql.query(
    `
    SELECT
      id::text AS id,
      first_name,
      last_name,
      preferred_name,
      full_name
    FROM alumni
    `,
  )) as AlumniIdentity[];
  return rows
    .map((row) => ({
      id: normalizeAlumniId(row.id),
      first_name: row.first_name,
      last_name: row.last_name,
      preferred_name: row.preferred_name,
      full_name: row.full_name,
    }))
    .filter((row) => isAlumniUuid(row.id));
}

export function addCentsByKey(totals: Map<string, number>, key: string, cents: number) {
  const id = normalizeAlumniId(key);
  const amount = Number(cents) || 0;
  if (!id || amount <= 0) return;
  totals.set(id, (totals.get(id) ?? 0) + amount);
}
