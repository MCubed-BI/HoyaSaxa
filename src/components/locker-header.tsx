import { ProductHeader } from "@/components/product-header";
import { VerifiedHoyaBadge } from "@/components/verified-hoya-badge";
import { portalNavItems, portalSecondaryItems, type NavKey } from "@/lib/nav";
import type { LockerViewer } from "@/lib/locker-viewer";

function fromForNav(current?: NavKey) {
  if (current === "newsflash") return "/newsflash";
  if (current === "feed") return "/feed";
  if (current === "portal-directory" || current === "profile") return "/directory";
  if (current === "blast") return "/portal/blast";
  if (current === "events") return "/events";
  if (current === "giving") return "/giving";
  if (current === "messages") return "/messages";
  return "/home";
}

export function LockerHeader({
  current,
  viewer,
}: {
  current?: NavKey;
  viewer?: LockerViewer | null;
}) {
  const primary = portalNavItems();
  const secondary = portalSecondaryItems();

  return (
    <ProductHeader
      homeHref="/home"
      items={primary}
      secondaryItems={secondary}
      current={current}
      roleLabel={viewer?.roleLabel}
      viewerLabel={viewer?.label}
      trailing={viewer?.verifiedHoya ? <VerifiedHoyaBadge /> : undefined}
      showSignOut={Boolean(viewer)}
      signOutFrom={fromForNav(current)}
      mobileNav="tabs"
    />
  );
}
