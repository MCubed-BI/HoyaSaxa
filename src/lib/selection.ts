export type SelectedPerson = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export function isSelectedEmail(value: string | null | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
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
