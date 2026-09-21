import { AppHeader } from "@/components/app-header";
import { PageMain, PageShell } from "@/components/page-chrome";
import type { NavKey } from "@/lib/nav";
import type { Viewer } from "@/lib/viewer";

export function PortalShell({
  viewer,
  current,
  children,
}: {
  viewer: Viewer;
  current?: NavKey;
  children: React.ReactNode;
}) {
  return (
    <PageShell>
      <AppHeader
        current={current}
        role={viewer.role}
        viewerLabel={viewer.label}
        verifiedHoya={viewer.verifiedHoya}
      />
      <PageMain className="pb-8">{children}</PageMain>
    </PageShell>
  );
}
