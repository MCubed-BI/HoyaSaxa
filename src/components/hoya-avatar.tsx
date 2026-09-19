import { initials } from "@/lib/format";
import { toNameFields } from "@/lib/locker-classify";
import type { LockerPerson } from "@/lib/locker-types";

export function HoyaAvatar({
  person,
  size = "md",
}: {
  person: Pick<LockerPerson, "preferredName" | "firstName" | "lastName" | "fullName" | "photoUrl">;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm";
  if (person.photoUrl) {
    return (
      // External roster photos are optional; initials cover the empty case.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.photoUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-navy/10`}
      />
    );
  }
  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-navy font-semibold text-white ring-1 ring-navy/10`}
      aria-hidden
    >
      {initials(toNameFields(person))}
    </div>
  );
}
