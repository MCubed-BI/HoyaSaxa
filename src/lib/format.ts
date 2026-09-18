import type { AlumniListItem } from "@/lib/types";

const HONORIFIC = /^(mr|mrs|ms|miss|dr|prof|rev|sir|hon)\.?$/i;

function stripHonorifics(name: string) {
  return name
    .split(/\s+/)
    .filter((part) => !HONORIFIC.test(part))
    .join(" ")
    .trim();
}

export function displayName(person: Pick<AlumniListItem, "preferred_name" | "first_name" | "last_name" | "full_name">) {
  const last = person.last_name?.trim() || "";
  const preferred = person.preferred_name ? stripHonorifics(person.preferred_name.trim()) : "";
  const looksLikeNickname =
    Boolean(preferred && last) && !preferred.toLowerCase().includes(last.toLowerCase());

  if (looksLikeNickname) return `${preferred} ${last}`;
  if (person.full_name?.trim()) return person.full_name.trim();
  return [person.first_name, last].filter(Boolean).join(" ") || preferred || "Unknown";
}

export function locationLabel(city?: string | null, state?: string | null) {
  return [city, state].filter(Boolean).join(", ") || null;
}

export function jobLabel(company?: string | null, title?: string | null) {
  if (company && title) return `${title}, ${company}`;
  return title || company || null;
}

export function initials(person: Pick<AlumniListItem, "preferred_name" | "first_name" | "last_name" | "full_name">) {
  const name = displayName(person);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
