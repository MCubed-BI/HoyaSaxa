import { PortalShell } from "@/components/portal-shell";
import { StatusCard } from "@/components/status-card";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function PortalEventsPage() {
  const viewer = await requireViewer();
  return (
    <PortalShell viewer={viewer} current="events">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Events</p>
        <h2 className="font-heading text-3xl text-white">Hoya gatherings</h2>
      </div>
      <StatusCard
        title="Coder 2 extension point"
        body="Upcoming / Past / My Events and Create Event (coach or board) belong here. This shell only reserves the route and nav."
      />
    </PortalShell>
  );
}
