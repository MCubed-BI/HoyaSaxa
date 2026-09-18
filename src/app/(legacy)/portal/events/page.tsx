import { PortalShell } from "@/components/portal-shell";
import { PortalTabs } from "@/components/portal-tabs";
import { StatusCard } from "@/components/status-card";
import { Button } from "@/components/ui/button";
import { canPostNewsflash, canUseOwnerTools } from "@/lib/roles";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function PortalEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const viewer = await requireViewer();
  const tab = (await searchParams).tab ?? "upcoming";
  const canCreate = canUseOwnerTools(viewer.role) || canPostNewsflash(viewer.role);

  return (
    <PortalShell viewer={viewer} current="events">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Events</p>
          <h2 className="font-heading text-3xl text-navy">Upcoming / Past / My Events</h2>
        </div>
        {canCreate ? (
          <Button asChild>
            <a href="mailto:football@guhoyas.com?subject=Create%20Hoya%20event">Create Event</a>
          </Button>
        ) : null}
      </div>
      <PortalTabs
        tabs={[
          { href: "/portal/events?tab=upcoming", label: "Upcoming", active: tab === "upcoming" },
          { href: "/portal/events?tab=past", label: "Past", active: tab === "past" },
          { href: "/portal/events?tab=mine", label: "My Events", active: tab === "mine" },
        ]}
      />
      <StatusCard
        title="Coder 2 extension point"
        body={`${tab} list is reserved. Create Event is coach/board-only in this shell (mailto placeholder).`}
      />
    </PortalShell>
  );
}
