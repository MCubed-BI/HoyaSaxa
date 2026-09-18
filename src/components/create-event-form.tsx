import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_CATEGORIES } from "@/lib/event-auth";

const ERRORS: Record<string, string> = {
  title: "Add a title of 120 characters or fewer.",
  category: "Choose a category.",
  starts_at: "Choose a valid date and time (Eastern).",
  location: "Location must be 200 characters or fewer.",
  thumbnail: "Thumbnail must be an http(s) URL, or leave it blank.",
  description: "Description must be 2,000 characters or fewer.",
};

export function CreateEventForm({ error }: { error?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Event details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action="/api/events" method="post" className="space-y-4">
          <input type="hidden" name="next" value="/events" />
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required maxLength={120} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                required
                defaultValue="Social"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                {EVENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="starts_at">Date and time (ET)</Label>
              <Input id="starts_at" name="starts_at" type="datetime-local" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="thumbnail_url">Thumbnail URL (optional)</Label>
            <Input id="thumbnail_url" name="thumbnail_url" type="url" maxLength={500} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Details (optional)</Label>
            <Textarea id="description" name="description" maxLength={2000} rows={4} />
          </div>
          {error && ERRORS[error] ? <p className="text-sm text-destructive">{ERRORS[error]}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Save event</Button>
            <Button asChild type="button" variant="outline">
              <Link href="/events">Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
