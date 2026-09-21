import { AppHeader } from "@/components/app-header";
import { LockerHeader } from "@/components/locker-header";
import { PageShell } from "@/components/page-chrome";
import { SiteHeader } from "@/components/site-header";
import type { LockerViewer } from "@/lib/locker-viewer";

export function GivingChrome({
  locker,
  children,
}: {
  locker: LockerViewer | null;
  children: React.ReactNode;
}) {
  const header =
    locker && locker.source !== "ga_session" ? (
      <LockerHeader current="giving" viewer={locker} />
    ) : locker ? (
      <SiteHeader current="giving" />
    ) : (
      <AppHeader current="giving" />
    );

  return (
    <PageShell>
      {header}
      {children}
    </PageShell>
  );
}
