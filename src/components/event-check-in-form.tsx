import { HoyaBadgeRow } from "@/components/hoya-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicBadge } from "@/lib/badges";

export function EventCheckInForm({
  eventId,
  actorName,
  alreadyCheckedIn,
  lifetimeCount,
  rank,
  percentile,
  checkedInAt,
  eventBadge = null,
}: {
  eventId: string;
  actorName: string;
  alreadyCheckedIn: boolean;
  lifetimeCount: number;
  rank: number | null;
  percentile: number | null;
  checkedInAt: string | null;
  eventBadge?: PublicBadge | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{alreadyCheckedIn ? "You are checked in" : "Check in"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alreadyCheckedIn ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {checkedInAt
                ? `Recorded ${new Date(checkedInAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET.`
                : "A durable attendance row already exists for you at this event."}
              {lifetimeCount > 0 ? ` Lifetime attendance: ${lifetimeCount}.` : ""}
              {!eventBadge && rank ? ` Rank #${rank}.` : ""}
              {!eventBadge && percentile != null ? ` Top ${percentile.toFixed(1)}%.` : ""}
            </p>
            {eventBadge ? <HoyaBadgeRow badges={[eventBadge]} /> : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Checking in as <span className="font-medium text-foreground">{actorName}</span>. You can only check
            yourself in — one record per person per event.
          </p>
        )}

        <form action={`/api/events/${eventId}/check-in`} method="post" className="space-y-4">
          <input type="hidden" name="next" value={`/events/${eventId}/check-in`} />
          <Button type="submit" disabled={alreadyCheckedIn}>
            {alreadyCheckedIn ? "Already checked in" : "Check in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
