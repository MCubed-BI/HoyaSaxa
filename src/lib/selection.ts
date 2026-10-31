export type SelectedPerson = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSelectedEmail(value: string | null | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

export function isAlumniSelectionId(value: string) {
  return UUID_RE.test(value.trim());
}

export function normalizeSelectionIds(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  return [
    ...new Set(
      ids
        .filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
        .map((id) => id.trim())
        .filter(isAlumniSelectionId),
    ),
  ];
}

/**
 * Collapse blast picks after an alumni merge: the deleted source id becomes the keeper,
 * and duplicate keeper entries are removed so one person counts as one selection.
 */
export function applyMergeToSelectedIds(ids: string[], sourceId: string, keeperId: string) {
  if (!sourceId || !keeperId || sourceId === keeperId) return normalizeSelectionIds(ids);
  const next: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const mapped = raw.trim() === sourceId ? keeperId : raw.trim();
    if (!isAlumniSelectionId(mapped) || seen.has(mapped)) continue;
    seen.add(mapped);
    next.push(mapped);
  }
  return next;
}

/**
 * Resolve stale pick ids using live alumni rows + merge redirects (merged id → keeper).
 * Drops ids that no longer exist and were never merged; dedupes by canonical id.
 */
export function canonicalizeSelectedIds(
  ids: string[],
  options: { existing: ReadonlySet<string>; redirects: ReadonlyMap<string, string> },
) {
  const next: string[] = [];
  const seen = new Set<string>();
  for (const raw of normalizeSelectionIds(ids)) {
    let id = raw;
    const visited = new Set<string>();
    while (!options.existing.has(id) && options.redirects.has(id) && !visited.has(id)) {
      visited.add(id);
      id = options.redirects.get(id)!;
    }
    if (!options.existing.has(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

export function mergeSelectedPeople(current: SelectedPerson[], incoming: SelectedPerson[]) {
  const byId = new Map(current.map((person) => [person.id, person]));
  const extras: SelectedPerson[] = [];
  for (const person of incoming) {
    if (!person.id) continue;
    const existing = byId.get(person.id);
    if (existing) {
      byId.set(person.id, {
        id: person.id,
        name: person.name || existing.name,
        phone: person.phone ?? existing.phone,
        email: person.email ?? existing.email,
      });
    } else {
      extras.push(person);
      byId.set(person.id, person);
    }
  }
  return [...current.map((person) => byId.get(person.id)!), ...extras];
}
