import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CoachMessageForm({ next = "/message" }: { next?: string }) {
  return (
    <form action="/api/portal/coach-messages" method="post" className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="From Coach Sgarlata" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" required rows={5} placeholder="Write the note alumni will read." />
      </div>
      <Button type="submit">Post to alumni</Button>
    </form>
  );
}

export function NewsflashForm({ next = "/board" }: { next?: string }) {
  return (
    <form action="/api/portal/newsflash" method="post" className="space-y-3">
      <input type="hidden" name="next" value={next} />
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
      <Button type="submit">Publish to Board</Button>
    </form>
  );
}

export function FundraisingCampaignForm({ next = "/fundraising" }: { next?: string }) {
  return (
    <form action="/api/portal/fundraising/campaigns" method="post" className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="title">Campaign</Label>
        <Input id="title" name="title" required placeholder="Spring giving challenge" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="goal_dollars">Goal (USD, optional)</Label>
          <Input id="goal_dollars" name="goal_dollars" type="number" min="0" step="1" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="donate_url">Donate link or mailto (placeholder)</Label>
          <Input id="donate_url" name="donate_url" placeholder="mailto:football@guhoyas.com" />
        </div>
      </div>
      <Button type="submit">Add campaign</Button>
    </form>
  );
}

export function FundraisingPledgeForm({ campaignId, defaultName }: { campaignId: string; defaultName?: string }) {
  return (
    <form action="/api/portal/fundraising/pledges" method="post" className="space-y-3">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="next" value="/giving" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${campaignId}`}>Name</Label>
          <Input id={`name-${campaignId}`} name="name" defaultValue={defaultName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`email-${campaignId}`}>Email</Label>
          <Input id={`email-${campaignId}`} name="email" type="email" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`amount-${campaignId}`}>Pledge amount (USD)</Label>
        <Input id={`amount-${campaignId}`} name="amount_dollars" type="number" min="1" step="1" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`note-${campaignId}`}>Note</Label>
        <Textarea id={`note-${campaignId}`} name="note" rows={2} />
      </div>
      <Button type="submit" variant="outline">
        Record pledge intent
      </Button>
    </form>
  );
}
