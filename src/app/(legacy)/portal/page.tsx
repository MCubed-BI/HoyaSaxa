import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { viewerSubtitle, requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

const ACTIONS = [
  { href: "/portal/directory", title: "Directory", body: "Look up classmates on read-only cards." },
  { href: "/portal/events", title: "Events", body: "Coder 2 fills upcoming / past / my events." },
  { href: "/portal/newsflash", title: "News", body: "Board Newsflash for Lars." },
  { href: "/portal/giving", title: "Giving", body: "Campaigns and pledge intents. Coder 3 extends." },
];

export default async function PortalHomePage() {
  const viewer = await requireViewer();

  return (
    <PortalShell viewer={viewer} current="home">
      <section className="rounded-2xl border border-gold/30 bg-[#0d1f3c] px-5 py-8">
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">{viewerSubtitle(viewer)}</p>
        <h2 className="mt-2 font-heading text-4xl text-white">Welcome back, Hoya.</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Legacy Locker is the alumnus shell. Staff tools stay behind the coach gate. Claimed
          sessions use <code>hoya_alum_session</code> and attach to your alumni id when Register/Claim
          sets the cookie.
        </p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        {ACTIONS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full border-gold/15 bg-[#0d1f3c] text-white">
              <CardContent className="py-5">
                <p className="font-medium text-gold">{item.title}</p>
                <p className="mt-1 text-sm text-white/65">{item.body}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="border-gold/15 bg-[#0d1f3c] text-white">
        <CardContent className="py-5">
          <p className="text-xs uppercase tracking-wide text-gold">Upcoming</p>
          <p className="mt-1 font-heading text-xl">Events lane is stubbed for Coder 2</p>
          <p className="mt-1 text-sm text-white/65">
            Mount upcoming event cards here. Create Event stays coach/board when that lane lands.
          </p>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
