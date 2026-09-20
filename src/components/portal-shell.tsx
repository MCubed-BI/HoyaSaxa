import Link from "next/link";
import { PageMain, PageShell } from "@/components/page-chrome";
import { ProductHeader } from "@/components/product-header";
import { portalMoreItems, portalNavItems, portalSecondaryItems, type NavKey } from "@/lib/nav";
import { roleLabel, type Role } from "@/lib/roles";
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
  const primary = portalNavItems();
  const more = portalMoreItems(viewer.role);

  return (
    <PageShell>
      <ProductHeader
        homeHref="/portal"
        items={primary}
        secondaryItems={portalSecondaryItems()}
        current={current}
        roleLabel={roleLabel(viewer.role)}
        viewerLabel={viewer.label}
        verifiedHoya={viewer.verifiedHoya}
        showSignOut
        signOutFrom={current === "blast" ? "/portal/blast" : "/portal"}
        mobileNav="tabs"
      />
      <PageMain className="pb-24 md:pb-8">{children}</PageMain>
      <MoreLinks items={more} role={viewer.role} />
    </PageShell>
  );
}

function MoreLinks({ items, role }: { items: ReturnType<typeof portalMoreItems>; role: Role }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-x-4 gap-y-2 px-4 pb-24 text-xs text-muted-foreground md:pb-8 sm:px-6">
      {items.map((item) => (
        <Link key={item.key} href={item.href} className="hover:text-navy">
          {item.label}
        </Link>
      ))}
      {role === "board" ? <span>Board can publish Board notes</span> : null}
    </div>
  );
}
