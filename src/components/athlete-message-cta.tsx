import Link from "next/link";
import { Button } from "@/components/ui/button";
import { messageAthleteHref } from "@/lib/messages-dm";

export function AthleteMessageCta({
  alumniId,
  name,
  emails = [],
}: {
  alumniId: string;
  name: string;
  emails?: string[];
}) {
  const email = emails.find(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <Button asChild>
        <Link href={messageAthleteHref(alumniId)}>Send message</Link>
      </Button>
      {email ? (
        <Button asChild variant="outline">
          <a href={`mailto:${email}`}>Email {name.split(" ")[0] || "alum"}</a>
        </Button>
      ) : null}
    </div>
  );
}
