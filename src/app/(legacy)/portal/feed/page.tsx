import { PortalShell } from "@/components/portal-shell";
import { PortalTabs } from "@/components/portal-tabs";
import { StatusCard } from "@/components/status-card";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "for-you", label: "For You" },
  { id: "teammates", label: "Teammates" },
  { id: "alumni", label: "Alumni" },
  { id: "following", label: "Following" },
] as const;

export default async function PortalFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const viewer = await requireViewer();
  const tab = (await searchParams).tab ?? "for-you";

  return (
    <PortalShell viewer={viewer} current="feed">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">For You</p>
        <h2 className="font-heading text-3xl text-white">Activity</h2>
      </div>
      <PortalTabs
        tabs={TABS.map((item) => ({
          href: `/portal/feed?tab=${item.id}`,
          label: item.label,
          active: tab === item.id,
        }))}
      />
      <Card className="border-gold/15 bg-[#0d1f3c] text-white">
        <CardContent className="py-5">
          <p className="text-sm text-white/80">Sample post · class year · football</p>
          <p className="mt-1 text-sm text-white/55">Coder 5 replaces this with real For You / teammate posts.</p>
        </CardContent>
      </Card>
      <StatusCard title="Coder 5 extension point" body={`Active tab: ${tab}. Keep class year and sport on each post.`} />
    </PortalShell>
  );
}
