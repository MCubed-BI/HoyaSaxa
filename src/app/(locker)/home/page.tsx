import { Suspense } from "react";
import Link from "next/link";
import { QuickActions } from "@/components/locker-cards";
import { LockerHomeDashboard } from "@/components/locker-home-dashboard";
import { LockerHeader } from "@/components/locker-header";
import { PageMain, PageShell } from "@/components/page-chrome";
import { HomeCardsSkeleton } from "@/components/ui/page-skeletons";
import { Button } from "@/components/ui/button";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function LockerHomePage() {
  const viewer = await requireLockerViewer();

  return (
    <PageShell>
      <LockerHeader current="home" viewer={viewer} />
      <PageMain className="pb-24 md:pb-8">
        <section className="app-masthead">
          <div>
            <p className="app-kicker">{viewer.roleLabel}</p>
            <h1 className="app-title">{`Welcome back, ${viewer.label}.`}</h1>
            <p className="app-lede">
              Open Directory, Events, Giving, or Board from the cards below. For You has the latest from Brothers and
              Board.
            </p>
          </div>
          <div className="app-masthead__actions">
            <Button asChild className="bg-silver text-silver-foreground hover:bg-silver/90">
              <Link href="/feed">Open For You</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/board">{viewer.canPostNewsflash ? "Write a Board note" : "Read Board"}</Link>
            </Button>
          </div>
        </section>

        <QuickActions />

        <Suspense fallback={<HomeCardsSkeleton />}>
          <LockerHomeDashboard />
        </Suspense>
      </PageMain>
    </PageShell>
  );
}
