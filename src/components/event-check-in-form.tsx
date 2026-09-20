import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EventCheckInForm({
  eventId,
  actorName,
  alreadyCheckedIn,
  canOverride,
  lifetimeCount,
  rank,
  percentile,
  checkedInAt,
}: {
  eventId: string;
  actorName: string;
  alreadyCheckedIn: boolean;
  canOverride: boolean;
  lifetimeCount: number;
  rank: number | null;
  percentile: number | null;
  checkedInAt: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{alreadyCheckedIn ? "You are checked in" : "Check in"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alreadyCheckedIn ? (
          <p className="text-sm text-muted-foreground">
            {checkedInAt
              ? `Recorded ${new Date(checkedInAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET.`
              : "A durable attendance row already exists for you at this event."}
            {lifetimeCount > 0
              ? ` Lifetime attendance: ${lifetimeCount}${rank ? ` · rank #${rank}` : ""}${
                  percentile != null ? ` · top ${percentile.toFixed(1)}%` : ""
                }.`
              : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Checking in as <span className="font-medium text-foreground">{actorName}</span>. Repeat visits stay one
            record unless a staff member overrides.
          </p>
        )}

        <form action={`/api/events/${eventId}/check-in`} method="post" className="space-y-4">
          <input type="hidden" name="next" value={`/events/${eventId}/check-in`} />
          <Button type="submit" disabled={alreadyCheckedIn && !canOverride}>
            {alreadyCheckedIn ? "Already checked in" : "Check in"}
          </Button>

          {canOverride ? (
            <fieldset className="space-y-3 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Staff: check in someone else</legend>
              <p className="text-sm text-muted-foreground">
                Use a claimed alumni id or a display name for an existing person.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="user_id">Name or user id</Label>
                  <Input id="user_id" name="user_id" maxLength={80} autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alum_id">Alumni id (optional)</Label>
                  <Input id="alum_id" name="alum_id" maxLength={36} autoComplete="off" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input id="override" name="override" type="checkbox" value="1" className="size-4" />
                <Label htmlFor="override" className="font-normal">
                  Override existing check-in (update timestamp)
                </Label>
              </div>
              <Button type="submit" variant="outline">
                Record staff check-in
              </Button>
            </fieldset>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
