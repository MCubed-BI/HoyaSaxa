import Link from "next/link";
import { ActivityList, QuickActions, UpcomingEventCard } from "@/components/locker-cards";
import { LockerHeader } from "@/components/locker-header";
import { Notice, PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadLockerHome } from "@/lib/locker-queries";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function LockerHomePage() {
  const viewer = await requireLockerViewer();
  const data = await loadLockerHome();

  return (
    <PageShell>
      <LockerHeader current="home" viewer={viewer} />
      <PageMain className="pb-24 md:pb-8">
        <PageHeader
          eyebrow={viewer.roleLabel}
          title={`Welcome back, ${viewer.label}.`}
          description="Home, For You, and Newsflash. Directory, Events, and Giving stay with their lanes — the cards below just link over."
          actions={
            <>
              <Button asChild>
                <Link href="/feed">Open For You</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/newsflash">
                  {viewer.canPostNewsflash ? "Write a Newsflash" : "Read Newsflash"}
                </Link>
              </Button>
            </>
          }
        />

        {data.usingFallback ? <Notice>{data.fallbackReason}</Notice> : null}

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
      </PageMain>
    </PageShell>
  );
}
