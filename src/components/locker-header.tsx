import { AppHeader } from "@/components/app-header";
import type { NavKey } from "@/lib/nav";
import { roleFromLockerViewer, type LockerViewer } from "@/lib/locker-viewer";

export function LockerHeader({
  current,
  viewer,
}: {
  current?: NavKey;
  viewer?: LockerViewer | null;
}) {
  return (
    <AppHeader
      current={current}
      role={roleFromLockerViewer(viewer)}
      viewerLabel={viewer?.label}
      verifiedHoya={viewer?.verifiedHoya}
    />
  );
}
