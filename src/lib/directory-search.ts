import { classYearLabel, displayName, positionLabel } from "@/lib/format";
import { athleteHref } from "@/lib/locker-paths";
import { toNameFields } from "@/lib/locker-classify";
import { lockerStubPeople } from "@/lib/locker-stubs";
import type { LockerPerson } from "@/lib/locker-types";
import type { AlumniListItem } from "@/lib/types";

export type DirectorySearchView = "admin" | "alum";

export type DirectoryNameFields = {
  first_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  full_name?: string | null;
};

export type DirectoryPersonSuggestion = {
  id: string;
  name: string;
  subtitle: string | null;
  href: string;
  score: number;
};

function cleanNamePart(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

export function nameSearchNeedle(q: string) {
  return q.replace(/\s+/g, " ").trim().toLowerCase();
}

export function nameMatchScore(person: DirectoryNameFields, q: string) {
  const needle = nameSearchNeedle(q);
  if (!needle) return 0;

  const last = cleanNamePart(person.last_name);
  const first = cleanNamePart(person.first_name);
  const preferred = cleanNamePart(person.preferred_name);
  const full = cleanNamePart(person.full_name);
  const display = cleanNamePart(displayName({
    preferred_name: person.preferred_name ?? null,
    first_name: person.first_name ?? null,
    last_name: person.last_name ?? "",
    full_name: person.full_name ?? null,
  }));
  const haystack = [preferred, first, last, full, display].filter(Boolean).join(" ");
  const tokens = needle.split(" ").filter(Boolean);

  if (display === needle || full === needle) return 100;
  if (last === needle) return 92;
  if (preferred === needle) return 90;
  if (first === needle) return 82;
  if (tokens.length > 1 && tokens.every((token) => haystack.includes(token))) {
    if (display.startsWith(needle) || full.startsWith(needle)) return 88;
    return 80;
  }
  if (last.startsWith(needle)) return 76;
  if (preferred.startsWith(needle)) return 74;
  if (display.startsWith(needle) || full.startsWith(needle)) return 70;
  if (first.startsWith(needle)) return 64;
  if (display.includes(needle) || full.includes(needle) || last.includes(needle) || preferred.includes(needle)) {
    return 55;
  }
  if (first.includes(needle)) return 48;
  return 0;
}

export function rankNameMatches<T extends DirectoryNameFields>(rows: T[], q: string) {
  return rows
    .map((row) => ({ row, score: nameMatchScore(row, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || displayName(nameFields(a.row)).localeCompare(displayName(nameFields(b.row))));
}

function nameFields(person: DirectoryNameFields): Parameters<typeof displayName>[0] {
  return {
    preferred_name: person.preferred_name ?? null,
    first_name: person.first_name ?? null,
    last_name: person.last_name ?? "",
    full_name: person.full_name ?? null,
  };
}

function suggestionSubtitle(input: { position?: string | null; class_year?: string | null; seasons?: string | null }) {
  return (
    [positionLabel(input.position), classYearLabel(input.class_year) || input.seasons].filter(Boolean).join(" · ") || null
  );
}

export function directoryProfileHref(id: string, view: DirectorySearchView) {
  return view === "admin" ? `/alumni/${id}` : athleteHref(id);
}

export function suggestionFromAlumni(person: AlumniListItem, view: DirectorySearchView, score: number): DirectoryPersonSuggestion {
  return {
    id: person.id,
    name: displayName(person),
    subtitle: suggestionSubtitle(person),
    href: directoryProfileHref(person.id, view),
    score,
  };
}

export function suggestionFromLocker(person: LockerPerson, score: number): DirectoryPersonSuggestion {
  const fields = toNameFields(person);
  return {
    id: person.id,
    name: displayName(fields),
    subtitle: [person.classLabel, positionLabel(person.position)].filter(Boolean).join(" · ") || person.sport,
    href: athleteHref(person.id),
    score,
  };
}

export function suggestFromAlumniRows(rows: AlumniListItem[], q: string, view: DirectorySearchView, limit = 8) {
  return rankNameMatches(rows, q)
    .slice(0, limit)
    .map(({ row, score }) => suggestionFromAlumni(row, view, score));
}

export function suggestFromLockerPeople(people: LockerPerson[], q: string, limit = 8) {
  return people
    .map((person) => ({ person, score: nameMatchScore(toNameFields(person), q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || displayName(toNameFields(a.person)).localeCompare(displayName(toNameFields(b.person))))
    .slice(0, limit)
    .map(({ person, score }) => suggestionFromLocker(person, score));
}

export function suggestFromLockerStubs(q: string, limit = 8) {
  return suggestFromLockerPeople(lockerStubPeople(), q, limit);
}

export function isStrongSingleMatch(hits: DirectoryPersonSuggestion[]) {
  if (hits.length === 1) return hits[0]!.score >= 55;
  if (hits.length > 1 && hits[0]!.score >= 90 && hits[0]!.score - hits[1]!.score >= 12) return true;
  return false;
}
