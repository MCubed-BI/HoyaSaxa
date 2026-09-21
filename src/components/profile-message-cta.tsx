import { Button } from "@/components/ui/button";

export function ProfileMessageCta({
  alumniId,
  name,
}: {
  alumniId: string;
  name: string;
}) {
  return (
    <form action="/api/messages/dm" method="post" className="pt-2" data-testid="profile-message-cta">
      <input type="hidden" name="alumniId" value={alumniId} />
      <Button type="submit" aria-label={`Message ${name}`}>
        Message
      </Button>
    </form>
  );
}
