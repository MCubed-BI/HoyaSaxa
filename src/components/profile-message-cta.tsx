"use client";

import { Button } from "@/components/ui/button";
import { cn } from "cn";

export function ProfileMessageCta({
  alumniId,
  name,
  compact = false,
}: {
  alumniId: string;
  name: string;
  compact?: boolean;
}) {
  return (
    <form
      action="/api/messages/dm"
      method="post"
      className={cn(compact ? "shrink-0" : "pt-2")}
      data-testid="profile-message-cta"
      onClick={(event) => event.stopPropagation()}
    >
      <input type="hidden" name="alumniId" value={alumniId} />
      <Button
        type="submit"
        size={compact ? "sm" : "default"}
        variant={compact ? "outline" : "default"}
        aria-label={`Message ${name}`}
      >
        Message
      </Button>
    </form>
  );
}
