import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MessagesCompose({ slug, mode = "official" }: { slug: string; mode?: "official" | "dm" }) {
  const isDm = mode === "dm";
  return (
    <form action={`/api/messages/channels/${slug}/posts`} method="post" className="space-y-3">
      {isDm ? null : (
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
          rows={isDm ? 4 : 5}
          placeholder={isDm ? "Write a direct message." : "Write the note alumni will read."}
        />
      </div>
      <Button type="submit">{isDm ? "Send message" : "Post to channel"}</Button>
    </form>
  );
}
