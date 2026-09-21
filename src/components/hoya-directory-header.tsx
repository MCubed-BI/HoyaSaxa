import { AppHeader } from "@/components/app-header";
import { ProductHeader } from "@/components/product-header";
import { roleFromLockerViewer, type LockerViewer } from "@/lib/locker-viewer";

export function HoyaDirectoryHeader({
  locker,
  signedIn,
  viewerLabel,
  verifiedHoya,
}: {
  locker?: LockerViewer | null;
  signedIn?: boolean;
  roleLabel?: string;
  viewerLabel?: string;
  canEmailClassmates?: boolean;
  verifiedHoya?: boolean;
}) {
  const viewer = locker ?? null;
  const isSignedIn = signedIn ?? Boolean(viewer);

  if (!isSignedIn) {
    return <ProductHeader homeHref="/home" items={[]} mobileNav="none" />;
  }

  return (
    <AppHeader
      current="directory"
      role={roleFromLockerViewer(viewer)}
      viewerLabel={viewer?.label ?? viewerLabel}
      verifiedHoya={viewer?.verifiedHoya ?? verifiedHoya}
    />
  );
}
