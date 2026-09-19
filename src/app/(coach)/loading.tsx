import { BrandMark } from "@/components/brand";
import { PageMain, PageShell } from "@/components/page-chrome";

export default function Loading() {
  return (
    <PageShell>
      <header className="sticky top-0 z-30 border-b bg-card/90 shadow-[var(--shadow-xs)] backdrop-blur-md">
        <div className="h-0.5 w-full bg-navy" />
        <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-2.5 sm:px-6">
          <BrandMark href="/" compact />
        </div>
      </header>
      <PageMain>
        <p className="text-sm text-muted-foreground">Loading HoyaSaxa…</p>
      </PageMain>
    </PageShell>
  );
}
