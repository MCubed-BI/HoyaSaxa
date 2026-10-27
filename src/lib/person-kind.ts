/** Directory affiliation: football alum/player, Georgetown supporter, or Development admin. */
export const PERSON_KINDS = ["alum", "supporter", "development"] as const;
export type PersonKind = (typeof PERSON_KINDS)[number];

/** Directory / filter chips — Alum and Support only. Development is an admin People role. */
export const DIRECTORY_PERSON_KINDS = ["alum", "supporter"] as const;
export type DirectoryPersonKind = (typeof DIRECTORY_PERSON_KINDS)[number];

export const PERSON_KIND_LABELS: Record<PersonKind, string> = {
  alum: "Alum",
  supporter: "Support",
  development: "Development",
};

/** Admin add-form labels (Player = roster alum). */
export const PERSON_KIND_ADMIN_LABELS: Record<PersonKind, string> = {
  alum: "Player (Alum)",
  supporter: "Supporter",
  development: "Development",
};

export function isPersonKind(value: unknown): value is PersonKind {
  return value === "alum" || value === "supporter" || value === "development";
}

export function isDirectoryPersonKind(value: unknown): value is DirectoryPersonKind {
  return value === "alum" || value === "supporter";
}

export function normalizePersonKind(value: unknown): PersonKind {
  if (typeof value !== "string") return "alum";
  const raw = value.trim().toLowerCase();
  if (raw === "supporter" || raw === "support" || raw === "supporter.") return "supporter";
  if (raw === "development" || raw === "dev" || raw === "developer") return "development";
  if (raw === "alum" || raw === "alumni" || raw === "player" || raw === "athlete") return "alum";
  return "alum";
}

export function personKindLabel(kind: PersonKind | null | undefined) {
  return PERSON_KIND_LABELS[normalizePersonKind(kind)];
}

export function parsePersonKinds(values: string[]): PersonKind[] {
  const out: PersonKind[] = [];
  for (const value of values) {
    const kind = normalizePersonKind(value);
    if (!out.includes(kind)) out.push(kind);
  }
  return out;
}

/** Username for Development admin login (letters, numbers, . _ -). */
export function normalizeDevelopmentUsername(value: unknown): string {
  if (typeof value !== "string") throw new Error("Username is required for Development.");
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Username is required for Development.");
  if (trimmed.length < 2 || trimmed.length > 40) {
    throw new Error("Username must be 2–40 characters.");
  }
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    throw new Error("Username may only use letters, numbers, periods, underscores, and hyphens.");
  }
  return trimmed;
}

export function assertDevelopmentPassword(value: unknown): string {
  if (typeof value !== "string") throw new Error("Password is required for Development.");
  if (value.length < 8) throw new Error("Password must be at least 8 characters.");
  if (value.length > 200) throw new Error("Password is too long.");
  return value;
}
