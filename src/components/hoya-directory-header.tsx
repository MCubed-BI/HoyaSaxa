import { ProductHeader } from "@/components/product-header";
import { portalNavItems, portalSecondaryItems, type NavItem } from "@/lib/nav";

export function HoyaDirectoryHeader({
  signedIn,
  roleLabel,
  viewerLabel,
  canEmailClassmates,
  verifiedHoya,
}: {
  signedIn?: boolean;
  roleLabel?: string;
  viewerLabel?: string;
  canEmailClassmates?: boolean;
  verifiedHoya?: boolean;
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

  const secondary: NavItem[] = [
    ...portalSecondaryItems(),
    ...(canEmailClassmates
      ? [{ href: "/portal/blast", label: "Email classmates", key: "blast" as const }]
      : []),
  ];

  return (
    <ProductHeader
      homeHref="/home"
      items={portalNavItems()}
      secondaryItems={secondary}
      current="portal-directory"
      roleLabel={roleLabel ?? "Alumnus"}
      viewerLabel={viewerLabel}
      verifiedHoya={verifiedHoya}
      showSignOut
      signOutFrom="/directory"
      mobileNav="tabs"
    />
  );
}
