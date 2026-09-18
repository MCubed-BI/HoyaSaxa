import { AppHeader } from "@/components/app-header";
import { LockerHeader } from "@/components/locker-header";
import type { LockerViewer } from "@/lib/locker-viewer";

export function EventsChrome({
  locker,
  children,
}: {
  locker: LockerViewer | null;
  children: React.ReactNode;
}) {
  const header =
    locker && locker.source !== "ga_session" ? (
      <LockerHeader current="events" viewer={locker} />
    ) : (
      <AppHeader current="events" />
    );

  return (
    <div className="flex min-h-full flex-col">
      {header}
      {children}
    </div>
  );
}
