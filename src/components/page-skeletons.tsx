import { BrandMark } from "@/components/brand";
import { PageMain, PageShell } from "@/components/page-chrome";
import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton({ href = "/" }: { href?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-card shadow-[var(--shadow-xs)]">
      <div className="h-0.5 w-full bg-navy">
        <div className="h-full w-16 bg-gold" />
      </div>
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <BrandMark href={href} compact />
        <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="ml-auto h-8 w-20 md:ml-0" />
      </div>
    </header>
  );
}

export function HomeSkeleton() {
  return (
    <PageShell>
      <HeaderSkeleton href="/home" />
      <PageMain className="pb-24 md:pb-8">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <p className="text-sm text-muted-foreground">Loading Home…</p>
      </PageMain>
    </PageShell>
  );
}

export function DirectorySkeleton({ href = "/directory" }: { href?: string }) {
  return (
    <PageShell>
      <HeaderSkeleton href={href} />
      <PageMain width={href === "/directory" ? "record" : "default"}>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <Skeleton className="h-28 rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Loading directory…</p>
      </PageMain>
    </PageShell>
  );
}

export function MeSkeleton() {
  return (
    <PageShell>
      <HeaderSkeleton href="/me" />
      <PageMain width="record">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <p className="text-sm text-muted-foreground">Loading your record…</p>
      </PageMain>
    </PageShell>
  );
}

export function HomeCardsSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]" aria-busy="true">
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}

function PageIntroSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-9 w-56 max-w-full" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function EventsSkeleton() {
  return (
    <PageShell>
      <HeaderSkeleton href="/events" />
      <PageMain>
        <PageIntroSkeleton label="Loading events…" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </PageMain>
    </PageShell>
  );
}

export function GivingSkeleton() {
  return (
    <PageShell>
      <HeaderSkeleton href="/giving" />
      <PageMain width="narrow">
        <PageIntroSkeleton label="Loading giving…" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </PageMain>
    </PageShell>
  );
}

export function MessagesSkeleton() {
  return (
    <PageShell>
      <HeaderSkeleton href="/messages" />
      <PageMain width="narrow" className="pb-24 md:pb-8">
        <PageIntroSkeleton label="Loading messages…" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </PageMain>
    </PageShell>
  );
}

export function MapSkeleton() {
  return (
    <PageShell>
      <HeaderSkeleton href="/find-my-alum" />
      <PageMain>
        <PageIntroSkeleton label="Loading Find My Alum…" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-[min(70vh,720px)] rounded-xl" />
      </PageMain>
    </PageShell>
  );
}

export function BlastSkeleton() {
  return (
    <PageShell>
      <HeaderSkeleton href="/blast" />
      <PageMain>
        <PageIntroSkeleton label="Loading blast…" />
        <Skeleton className="h-36 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </PageMain>
    </PageShell>
  );
}

export function FeedSkeleton() {
  return (
    <PageShell>
      <HeaderSkeleton href="/feed" />
      <PageMain width="narrow" className="pb-24 md:pb-8">
        <PageIntroSkeleton label="Loading For You…" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </PageMain>
    </PageShell>
  );
}

export function FormSkeleton({ href = "/events/new", label = "Loading form…" }: { href?: string; label?: string }) {
  return (
    <PageShell>
      <HeaderSkeleton href={href} />
      <PageMain width="form">
        <PageIntroSkeleton label={label} />
        <Skeleton className="h-80 rounded-xl" />
      </PageMain>
    </PageShell>
  );
}

export function EventsListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

export function MapCanvasSkeleton() {
  return (
    <div
      className="flex h-[min(70vh,720px)] items-center justify-center rounded-xl border bg-card shadow-[var(--shadow-card)]"
      aria-busy="true"
    >
      <div className="space-y-3 p-6 text-center">
        <Skeleton className="mx-auto h-10 w-10 rounded-full" />
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    </div>
  );
}
