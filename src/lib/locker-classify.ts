import { classYearLabel, cleanDisplay, displayName, locationLabel, positionLabel } from "@/lib/format";
import type { DirectoryPill, LockerKind, LockerPerson, LockerSource } from "@/lib/locker-types";

const ACADEMIC_CLASS =
  /^(?:r[-\s]?)?(fr|so|jr|sr|gr|freshman|sophomore|junior|senior|graduate)\.?$/i;

export function currentRosterYear(now = new Date()) {
  return now.getFullYear();
}

export function isAcademicClassLabel(value?: string | null) {
  return Boolean(value && ACADEMIC_CLASS.test(value.trim()));
}

export function classifyLockerKind(input: {
  kind?: LockerKind | null;
  classYear?: string | null;
  latestRosterYear?: number | null;
  latestRosterClass?: string | null;
  now?: Date;
}): LockerKind {
  if (input.kind === "coach" || input.kind === "staff") return input.kind;
  const year = currentRosterYear(input.now);
  if (input.latestRosterYear && input.latestRosterYear >= year) return "athlete";
  if (
    input.latestRosterYear &&
    input.latestRosterYear >= year - 1 &&
    isAcademicClassLabel(input.latestRosterClass)
  ) {
    return "athlete";
  }
  if (isAcademicClassLabel(input.classYear)) return "athlete";
  return "alumni";
}

export function matchesDirectoryPill(kind: LockerKind, role: DirectoryPill) {
  if (role === "all") return true;
  if (role === "athletes") return kind === "athlete";
  if (role === "alumni") return kind === "alumni";
  if (role === "coaches") return kind === "coach";
  return kind === "staff";
}

export function classLabel(input: {
  classYear?: string | null;
  latestRosterClass?: string | null;
  latestRosterYear?: number | null;
}) {
  const fromYear = classYearLabel(input.classYear);
  if (fromYear) return fromYear;
  const rosterClass = classYearLabel(input.latestRosterClass) ?? cleanDisplay(input.latestRosterClass);
  if (rosterClass) return rosterClass;
  return null;
}

export function publicCity(input: {
  city?: string | null;
  state?: string | null;
  hometownCity?: string | null;
  hometownState?: string | null;
}) {
  return (
    locationLabel(input.city, input.state) ||
    locationLabel(input.hometownCity, input.hometownState)
  );
}

export function toNameFields(person: {
  firstName: string | null;
  lastName: string;
  preferredName: string | null;
  fullName: string | null;
}) {
  return {
    preferred_name: person.preferredName,
    first_name: person.firstName,
    last_name: person.lastName,
    full_name: person.fullName,
  };
}

export function searchHaystack(person: Pick<
  LockerPerson,
  | "firstName"
  | "lastName"
  | "preferredName"
  | "fullName"
  | "position"
  | "classYear"
  | "classLabel"
  | "sport"
  | "city"
  | "state"
  | "hometownCity"
  | "hometownState"
  | "kind"
  | "companyName"
  | "jobTitle"
>) {
  return [
    displayName(toNameFields(person)),
    person.firstName,
    person.lastName,
    person.preferredName,
    person.fullName,
    person.position,
    person.classYear,
    person.classLabel,
    person.sport,
    person.city,
    person.state,
    person.hometownCity,
    person.hometownState,
    person.kind,
    person.companyName,
    person.jobTitle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesLockerSearch(person: Parameters<typeof searchHaystack>[0], q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return searchHaystack(person).includes(needle);
}

export function composeAbout(person: {
  firstName: string | null;
  lastName: string;
  preferredName: string | null;
  fullName: string | null;
  kind: LockerKind;
  position: string | null;
  sport: string;
  headline: string | null;
  about: string | null;
}) {
  if (person.about?.trim()) return person.about.trim();
  if (person.headline?.trim()) return person.headline.trim();
  const name = displayName(toNameFields(person));
  const role =
    person.kind === "coach"
      ? "coach"
      : person.kind === "staff"
        ? "staff member"
        : person.kind === "athlete"
          ? "athlete"
          : "alumnus";
  const position = positionLabel(person.position);
  const positionText = position ? ` · ${position}` : "";
  return `${name} — ${person.sport} ${role}${positionText}.`;
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return {
    rows: items.slice(start, start + pageSize),
    total: items.length,
    page: safePage,
    pageSize,
  };
}

export function mergeDirectoryPages<T>(stubs: T[], roster: T[], page: number, pageSize: number) {
  const merged = [...stubs, ...roster];
  return paginateItems(merged, page, pageSize);
}

export function kindLabel(kind: LockerKind) {
  if (kind === "athlete") return "Athlete";
  if (kind === "alumni") return "Alumni";
  if (kind === "coach") return "Coach";
  return "Staff";
}

export function sourceLabel(source: LockerSource) {
  return source === "sample" ? "Sample card" : "Hoya roster";
}
