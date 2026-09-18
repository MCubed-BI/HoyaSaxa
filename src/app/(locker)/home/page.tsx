import Link from "next/link";
import { ActivityList, QuickActions, UpcomingEventCard } from "@/components/locker-cards";
import { LockerHeader } from "@/components/locker-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadLockerHome } from "@/lib/locker-queries";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function LockerHomePage() {
  const viewer = await requireLockerViewer();
  const data = await loadLockerHome();

  return (
    <div className="flex min-h-full flex-col">
      <LockerHeader current="home" viewer={viewer} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <section>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {viewer.roleLabel} · {viewer.source === "hoya_alum_session" ? "hoya_alum_session" : "staff session"}
          </p>
          <h2 className="font-heading text-3xl text-navy">Welcome back, {viewer.label}.</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Home, For You, and Lars Newsflash. Directory, Events, and Giving stay with their lanes —
            the cards below just link over.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/feed"
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              Open For You
            </Link>
            <Link href="/newsflash" className="rounded-md border px-3 py-1.5 text-sm">
              {viewer.canPostNewsflash ? "Write a Newsflash" : "Read Newsflash"}
            </Link>
          </div>
        </section>

        {data.usingFallback ? (
          <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
            {data.fallbackReason}
          </p>
        ) : null}

        <QuickActions canOpenStaffDirectory={viewer.source === "ga_session"} />

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <UpcomingEventCard event={data.upcomingEvent} />
          <Card>
            <CardHeader>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Recent activity
              </p>
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
      </main>
    </div>
  );
}
