import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewsflashForm() {
  return (
    <form action="/api/locker/newsflash" method="post" className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-white/80">
          Headline
        </Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Weekend gathering, game week, board note…"
          className="border-white/20 bg-navy/40 text-white placeholder:text-white/35"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="event_at" className="text-white/80">
          Event date (optional)
        </Label>
        <Input
          id="event_at"
          name="event_at"
          type="date"
          className="border-white/20 bg-navy/40 text-white"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body" className="text-white/80">
          Details
        </Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={5}
          className="border-white/20 bg-navy/40 text-white placeholder:text-white/35"
        />
      </div>
      <Button type="submit" className="bg-gold text-navy hover:bg-gold/90">
        Publish newsflash
      </Button>
    </form>
  );
}
