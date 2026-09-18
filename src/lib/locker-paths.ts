export const LOCKER_PUBLIC_PATHS = ["/directory", "/athletes", "/locker"] as const;

export function isLockerPublicPath(pathname: string) {
  return LOCKER_PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function parseDirectoryPill(value: string | null | undefined) {
  const normalized = (value ?? "all").trim().toLowerCase();
  if (normalized === "athletes") return "athletes" as const;
  if (normalized === "alumni") return "alumni" as const;
  if (normalized === "coaches") return "coaches" as const;
  if (normalized === "staff") return "staff" as const;
  return "all" as const;
}

export function parseAthleteTab(value: string | null | undefined) {
  const normalized = (value ?? "overview").trim().toLowerCase();
  if (normalized === "stats") return "stats" as const;
  if (normalized === "photos") return "photos" as const;
  if (normalized === "career") return "career" as const;
  if (normalized === "qa" || normalized === "q&a" || normalized === "qna") return "qa" as const;
  return "overview" as const;
}

export function parseLockerPage(value: string | null | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function directoryHref(input: { q?: string; role?: string; page?: number }) {
  const params = new URLSearchParams();
  const q = input.q?.trim();
  if (q) params.set("q", q);
  const role = parseDirectoryPill(input.role);
  if (role !== "all") params.set("role", role);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `/directory?${query}` : "/directory";
}

export function athleteHref(id: string, tab?: string) {
  const parsed = parseAthleteTab(tab);
  if (parsed === "overview") return `/athletes/${id}`;
  return `/athletes/${id}?tab=${parsed}`;
}
