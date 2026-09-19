import { ProductHeader } from "@/components/product-header";
import { portalMoreItems, portalNavItems, type NavKey } from "@/lib/nav";
import type { LockerViewer } from "@/lib/locker-viewer";

export function LockerHeader({
  current,
  viewer,
}: {
  current?: NavKey;
  viewer?: LockerViewer | null;
}) {
  const primary = portalNavItems();
  const more = viewer ? portalMoreItems(viewer.role === "coach" ? "coach" : viewer.role) : [];
  const secondary = more.filter((item) => item.key === "feed" || item.key === "newsflash");

  return (
    <ProductHeader
      homeHref="/home"
      items={primary}
      secondaryItems={secondary}
      current={current}
      roleLabel={viewer?.roleLabel}
      viewerLabel={viewer?.label}
      showSignOut={Boolean(viewer)}
      mobileNav="tabs"
    />
  );
}
