import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewsflashForm() {
  return (
    <form action="/api/locker/newsflash" method="post" className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="title">Headline</Label>
        <Input id="title" name="title" required placeholder="Weekend gathering, game week, board note…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="event_at">Event date (optional)</Label>
        <Input id="event_at" name="event_at" type="date" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Details</Label>
        <Textarea id="body" name="body" required rows={5} />
      </div>
      <Button type="submit">Publish newsflash</Button>
    </form>
  );
}
