import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MessagesCompose({
  slug,
  action,
  variant = "official",
  hiddenFields,
  recipientName,
}: {
  slug?: string;
  action?: string;
  variant?: "official" | "dm";
  hiddenFields?: Record<string, string>;
  recipientName?: string;
}) {
  const formAction = action ?? (slug ? `/api/messages/channels/${slug}/posts` : "/api/messages/dm");
  const dm = variant === "dm";

  return (
    <form action={formAction} method="post" className="space-y-3">
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      {dm ? null : (
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="From Coach Sgarlata" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={dm ? 4 : 5}
          placeholder={
            dm
              ? recipientName
                ? `Write ${recipientName} a note.`
                : "Write a direct message."
              : "Write the note alumni will read."
          }
        />
      </div>
      <Button type="submit">{dm ? "Send message" : "Post to channel"}</Button>
    </form>
  );
}
