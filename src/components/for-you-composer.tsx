import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type FeedSection } from "@/lib/feed-sections";

const COPY: Record<FeedSection, { submit: string; title?: string; placeholder: string; titleRequired?: boolean }> = {
  brothers: {
    submit: "Post to Brothers",
    placeholder: "What is going on with the brotherhood?",
  },
  board: {
    submit: "Publish to Board",
    title: "Headline",
    placeholder: "Weekend gathering, game week, board note…",
    titleRequired: true,
  },
  sgarlata: {
    submit: "Post from staff",
    title: "Title",
    placeholder: "Write the note alumni will read.",
  },
};

export function ForYouComposer({ section }: { section: FeedSection }) {
  const copy = COPY[section];

  return (
    <form action="/api/feed/posts" method="post" className="for-you__composer space-y-2.5">
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="next" value={`/feed#${section}`} />
      {copy.title ? (
        <div className="space-y-1">
          <Label htmlFor={`${section}-title`} className="text-xs">
            {copy.title}
          </Label>
          <Input
            id={`${section}-title`}
            name="title"
            required={copy.titleRequired}
            placeholder={copy.title}
            className="h-8"
          />
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor={`${section}-title`} className="text-xs">
            Title (optional)
          </Label>
          <Input id={`${section}-title`} name="title" placeholder="Optional headline" className="h-8" />
        </div>
      )}
      {section === "board" ? (
        <div className="space-y-1">
          <Label htmlFor={`${section}-event_at`} className="text-xs">
            Event date (optional)
          </Label>
          <Input id={`${section}-event_at`} name="event_at" type="date" className="h-8" />
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor={`${section}-body`} className="sr-only">
          Details
        </Label>
        <Textarea
          id={`${section}-body`}
          name="body"
          required
          rows={3}
          placeholder={copy.placeholder}
          className="min-h-16"
        />
      </div>
      <Button type="submit" size="sm">
        {copy.submit}
      </Button>
    </form>
  );
}
