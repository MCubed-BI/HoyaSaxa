import { EventCheckInQr } from "@/components/event-check-in-qr";
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
  qrToken = null,
  selfCheckInAllowed = false,
  canAdminSelfCheckIn = false,
}: {
  eventId: string;
  actorName: string;
  alreadyCheckedIn: boolean;
  lifetimeCount: number;
  rank: number | null;
  percentile: number | null;
  checkedInAt: string | null;
  eventBadge?: PublicBadge | null;
  qrToken?: string | null;
  selfCheckInAllowed?: boolean;
  canAdminSelfCheckIn?: boolean;
}) {
  const title = alreadyCheckedIn
    ? "You are checked in"
    : selfCheckInAllowed
      ? "Check in"
      : "Your check-in code";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
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
        ) : selfCheckInAllowed ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Checking in as <span className="font-medium text-foreground">{actorName}</span>. This
              event allows self check-in — tap below, or show your QR if an admin is scanning at the
              door.
            </p>
            <form action={`/api/events/${eventId}/check-in`} method="post">
              <input type="hidden" name="next" value={`/events/${eventId}/check-in`} />
              <Button type="submit">Check in</Button>
            </form>
            {qrToken ? <EventCheckInQr token={qrToken} label={actorName} /> : null}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Checking in as <span className="font-medium text-foreground">{actorName}</span>. An admin
              must scan this code to mark you checked in — that keeps Hoyas opening the app at
              events.
            </p>
            {qrToken ? <EventCheckInQr token={qrToken} label={actorName} /> : null}
            {canAdminSelfCheckIn ? (
              <form
                action={`/api/events/${eventId}/check-in`}
                method="post"
                className="space-y-2 border-t pt-4"
              >
                <input type="hidden" name="next" value={`/events/${eventId}/check-in`} />
                <p className="text-xs text-muted-foreground">
                  Admin only — check yourself in without a scan.
                </p>
                <Button type="submit" variant="outline" size="sm">
                  Check myself in
                </Button>
              </form>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
