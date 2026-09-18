import Link from "next/link";
import { ActivityList, QuickActions, UpcomingEventCard } from "@/components/locker-cards";
import { LockerHeader } from "@/components/locker-header";
import { loadLockerHome } from "@/lib/locker-queries";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function LockerHomePage() {
  const viewer = await requireLockerViewer();
  const data = await loadLockerHome();

  return (
    <>
      <LockerHeader current="home" viewer={viewer} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="overflow-hidden rounded-2xl border border-gold/30 bg-[linear-gradient(160deg,#041e42_0%,#16325c_55%,#0b2748_100%)] px-6 py-8 sm:px-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold">
            {viewer.roleLabel} · {viewer.source === "hoya_alum_session" ? "hoya_alum_session" : "staff session"}
          </p>
          <h2 className="mt-2 font-heading text-4xl text-white sm:text-5xl">Welcome back, {viewer.label}.</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
            Hoya Football Legacy Locker — Home, For You, and Lars Newsflash. Directory, Events, and
            Giving stay with their lanes; these cards just get you there.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/feed"
              className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-navy hover:bg-gold/90"
            >
              Open For You
            </Link>
            <Link
              href="/newsflash"
              className="rounded-md border border-gold/40 px-4 py-2 text-sm text-gold hover:bg-gold/10"
            >
              {viewer.canPostNewsflash ? "Write a Newsflash" : "Read Newsflash"}
            </Link>
          </div>
        </section>

        {data.usingFallback ? (
          <p className="rounded-lg border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
            {data.fallbackReason} Showing locker demo content so Home still renders.
          </p>
        ) : null}

        <QuickActions canOpenStaffDirectory={viewer.source === "ga_session"} />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <UpcomingEventCard event={data.upcomingEvent} />
          <section className="rounded-xl border border-white/10 bg-card/80 px-5 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">
                  Recent activity
                </p>
                <h3 className="font-heading text-2xl text-white">Locker pulse</h3>
              </div>
              <Link href="/feed" className="text-sm text-gold hover:underline">
                For You
              </Link>
            </div>
            <ActivityList items={data.activity} />
          </section>
        </div>
      </main>
    </>
  );
}
