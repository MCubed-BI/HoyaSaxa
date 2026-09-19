import { ProductHeader } from "@/components/product-header";
import { portalNavItems, portalSecondaryItems } from "@/lib/nav";

export function HoyaDirectoryHeader({
  signedIn,
  roleLabel,
  viewerLabel,
}: {
  signedIn?: boolean;
  roleLabel?: string;
  viewerLabel?: string;
}) {
  if (!signedIn) {
    return (
      <ProductHeader
        homeHref="/directory"
        items={[]}
        mobileNav="none"
      />
    );
  }

  return (
    <ProductHeader
      homeHref="/home"
      items={portalNavItems()}
      secondaryItems={portalSecondaryItems()}
      current="portal-directory"
      roleLabel={roleLabel ?? "Alumnus"}
      viewerLabel={viewerLabel}
      showSignOut
      mobileNav="tabs"
    />
  );
}
