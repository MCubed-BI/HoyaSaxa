import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { listCoachMessages, listNewsflashPosts } from "@/lib/portal-queries";
import { isMissingDatabaseConfig } from "@/lib/db";
import { viewerSubtitle, requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

const ACTIONS = [
  { href: "/portal/directory", title: "Directory" },
  { href: "/portal/events", title: "Events" },
  { href: "/portal/newsflash", title: "News" },
  { href: "/portal/giving", title: "Giving" },
];

export default async function PortalHomePage() {
  const viewer = await requireViewer();
  let latestNote: string | null = null;
  let latestNews: string | null = null;
  try {
    const [messages, news] = await Promise.all([listCoachMessages(1), listNewsflashPosts(1)]);
    latestNote = messages[0]?.title || (messages[0] ? "Message from Sgarlata" : null);
    latestNews = news[0]?.title ?? null;
  } catch (error) {
    if (!isMissingDatabaseConfig(error)) throw error;
  }

  return (
    <PortalShell viewer={viewer} current="home">
      <section className="rounded-2xl border border-gold/30 bg-[#0d1f3c] px-5 py-8">
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">{viewerSubtitle(viewer)}</p>
        <h2 className="mt-2 font-heading text-4xl text-white">Welcome to the Hoya family.</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Legacy Locker home. Coder 5 can replace this hero. Claimed sessions use hoya_alum_session.
        </p>
      </section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACTIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-gold/25 bg-[#0d1f3c] px-4 py-5 text-center font-medium text-gold"
          >
            {item.title}
          </Link>
        ))}
      </div>
      <Card className="border-gold/15 bg-[#0d1f3c] text-white">
        <CardContent className="py-5">
          <p className="text-xs uppercase tracking-wide text-gold">Upcoming event</p>
          <p className="mt-1 font-heading text-xl">Coder 2 mounts the next game or gathering here</p>
          <Link href="/portal/events" className="mt-2 inline-block text-sm text-gold hover:underline">
            See all events
          </Link>
        </CardContent>
      </Card>
      <Card className="border-gold/15 bg-[#0d1f3c] text-white">
        <CardContent className="space-y-2 py-5">
          <p className="text-xs uppercase tracking-wide text-gold">Recent activity</p>
          <Link href="/portal/messages" className="block text-sm text-white/80 hover:text-gold">
            {latestNote || "Message from Sgarlata — no note yet"}
          </Link>
          <Link href="/portal/newsflash" className="block text-sm text-white/80 hover:text-gold">
            {latestNews || "Newsflash — no board post yet"}
          </Link>
          <Link href="/portal/feed" className="block text-sm text-gold hover:underline">
            Open For You feed
          </Link>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
