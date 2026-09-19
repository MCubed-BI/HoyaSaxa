import { Suspense } from "react";
import Link from "next/link";
import { QuickActions } from "@/components/locker-cards";
import { LockerHomeDashboard } from "@/components/locker-home-dashboard";
import { LockerHeader } from "@/components/locker-header";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { HomeCardsSkeleton } from "@/components/page-skeletons";
import { Button } from "@/components/ui/button";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function LockerHomePage() {
  const viewer = await requireLockerViewer();

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

        <QuickActions canOpenStaffDirectory={viewer.source === "ga_session"} />

        <Suspense fallback={<HomeCardsSkeleton />}>
          <LockerHomeDashboard />
        </Suspense>
      </PageMain>
    </PageShell>
  );
}
