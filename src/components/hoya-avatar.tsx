import { primaryPhotoUrl } from "@/lib/athlete-photo-slots";
import { initials } from "@/lib/format";

export type DirectoryPhotoPerson = {
  preferredName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  preferred_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  photoUrl?: string | null;
  football_photo_url?: string | null;
  linkedin_photo_url?: string | null;
  footballPhotoUrl?: string | null;
  linkedinPhotoUrl?: string | null;
};

function avatarNameFields(person: DirectoryPhotoPerson) {
  return {
    preferred_name: person.preferred_name ?? person.preferredName ?? null,
    first_name: person.first_name ?? person.firstName ?? null,
    last_name: person.last_name ?? person.lastName ?? "",
    full_name: person.full_name ?? person.fullName ?? null,
  };
}

export function HoyaAvatar({
  person,
  size = "md",
}: {
  person: DirectoryPhotoPerson;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm";
  const photo = primaryPhotoUrl(person);
  if (photo) {
    return (
      // External roster / LinkedIn photos are optional; initials cover the empty case.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover object-top ring-1 ring-navy/10`}
      />
    );
  }
  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-navy font-semibold text-white ring-1 ring-navy/10`}
      aria-hidden
    >
      {initials(avatarNameFields(person))}
    </div>
  );
}
