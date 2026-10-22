/** Directory affiliation: football alum/player vs Georgetown supporter. */
export const PERSON_KINDS = ["alum", "supporter"] as const;
export type PersonKind = (typeof PERSON_KINDS)[number];

export const PERSON_KIND_LABELS: Record<PersonKind, string> = {
  alum: "Alum",
  supporter: "Support",
};

/** Admin add-form labels (Player = roster alum). */
export const PERSON_KIND_ADMIN_LABELS: Record<PersonKind, string> = {
  alum: "Player (Alum)",
  supporter: "Supporter",
};

export function isPersonKind(value: unknown): value is PersonKind {
  return value === "alum" || value === "supporter";
}

export function normalizePersonKind(value: unknown): PersonKind {
  if (typeof value !== "string") return "alum";
  const raw = value.trim().toLowerCase();
  if (raw === "supporter" || raw === "support" || raw === "supporter.") return "supporter";
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
