import { ProductHeader } from "@/components/product-header";

export function HoyaDirectoryHeader({ signedIn }: { signedIn?: boolean }) {
  return (
    <ProductHeader
      homeHref="/directory"
      items={[]}
      roleLabel={signedIn ? "Alum session" : undefined}
      mobileNav="none"
    />
  );
}
