import { PortalShell } from "@/components/portal-shell";
import { StatusCard } from "@/components/status-card";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function PortalFeedPage() {
  const viewer = await requireViewer();
  return (
    <PortalShell viewer={viewer} current="feed">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">For You</p>
        <h2 className="font-heading text-3xl text-white">Activity feed</h2>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {["For You", "Teammates", "Alumni", "Following"].map((tab) => (
          <span key={tab} className="rounded-full border border-gold/30 px-3 py-1 text-gold">
            {tab}
          </span>
        ))}
      </div>
      <StatusCard
        title="Coder 5 extension point"
        body="Home/feed/newsflash posts with class year and sport belong here. This page only reserves the tabs."
      />
    </PortalShell>
  );
}
