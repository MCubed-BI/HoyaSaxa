import { AppHeader } from "@/components/app-header";
import type { NavKey } from "@/lib/nav";
import { requireViewer } from "@/lib/viewer";

export async function SiteHeader({ current }: { current?: NavKey }) {
  const viewer = await requireViewer();
  return (
    <AppHeader
      current={current}
      role={viewer.role}
      viewerLabel={viewer.label}
      verifiedHoya={viewer.verifiedHoya}
    />
  );
}
