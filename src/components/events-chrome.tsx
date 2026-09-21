import { AppHeader } from "@/components/app-header";
import { PageShell } from "@/components/page-chrome";
import { roleFromLockerViewer, type LockerViewer } from "@/lib/locker-viewer";

export function EventsChrome({
  locker,
  children,
}: {
  locker: LockerViewer | null;
  children: React.ReactNode;
}) {
  return (
    <PageShell>
      <AppHeader
        current="events"
        role={roleFromLockerViewer(locker)}
        viewerLabel={locker?.label}
        verifiedHoya={locker?.verifiedHoya}
      />
      {children}
    </PageShell>
  );
}
