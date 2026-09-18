const TWO_DIGIT_CUTOFF = 35;

export function expandTwoDigitYear(two: string) {
  const value = Number.parseInt(two, 10);
  if (!Number.isFinite(value) || value < 0 || value > 99) return null;
  return String(value <= TWO_DIGIT_CUTOFF ? 2000 + value : 1900 + value);
}

export function parseClassYearInput(raw: string | null | undefined) {
  const text = (raw ?? "").trim();
  if (!text) return null;

  const compact = text.replace(/\s+/g, " ");
  const apostrophe = compact.match(/[`'’'](\d{2})\b/);
  if (apostrophe) return expandTwoDigitYear(apostrophe[1]!);

  const four = compact.match(/\b((?:19|20)\d{2})\b/);
  if (four) return four[1] ?? null;

  const two = compact.match(/\b(\d{2})\b/);
  if (two) return expandTwoDigitYear(two[1]!);

  return null;
}

export function classYearTwoDigit(year4: string) {
  if (!/^(?:19|20)\d{2}$/.test(year4)) return null;
  return year4.slice(2);
}

export function normalizeLastName(raw: string | null | undefined) {
  return (raw ?? "").trim().replace(/\s+/g, " ");
}

export function storedClassYearMatches(stored: string | null | undefined, year4: string) {
  if (!stored || !year4) return false;
  const parsed = parseClassYearInput(stored);
  if (parsed === year4) return true;
  const digits = stored.replace(/\D/g, "");
  if (digits === year4) return true;
  const two = classYearTwoDigit(year4);
  return Boolean(two && (digits === two || digits.endsWith(two)));
}
