import Link from "next/link";
import { AppIcon } from "@/components/icons";
import { ActivityList, UpcomingEventCard } from "@/components/locker-cards";
import { Notice } from "@/components/page-chrome";
import { Timestamp } from "@/components/timestamp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadLockerHome } from "@/lib/locker-queries";

export async function LockerHomeDashboard() {
  const data = await loadLockerHome();
  const loadedAt = new Date().toISOString();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          Loaded <Timestamp value={loadedAt} />
        </p>
        {data.usingFallback ? (
          <p className="inline-flex items-center gap-1 text-destructive">
            <AppIcon name="alert" className="size-3.5" />
            Showing fallback content
          </p>
        ) : null}
      </div>

      {data.usingFallback ? (
        <Notice tone="danger">
          <span className="flex items-start gap-2">
            <AppIcon name="alert" className="mt-0.5 size-4 shrink-0" />
            <span>{data.fallbackReason}</span>
          </span>
        </Notice>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <UpcomingEventCard event={data.upcomingEvent} />
        <Card>
          <CardHeader>
            <p className="app-kicker text-muted-foreground">Recent activity</p>
            <CardTitle className="text-navy">Latest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ActivityList items={data.activity} />
            <Link href="/feed" className="text-sm underline underline-offset-2">
              For You
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
