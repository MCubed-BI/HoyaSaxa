import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MessagesCompose({ slug }: { slug: string }) {
  return (
    <form action={`/api/messages/channels/${slug}/posts`} method="post" className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="From Coach Sgarlata" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" required rows={5} placeholder="Write the note alumni will read." />
      </div>
      <Button type="submit">Post to channel</Button>
    </form>
  );
}
