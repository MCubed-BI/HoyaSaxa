export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-white/10 bg-navy text-navy-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
            Georgetown Football
          </p>
          <h1 className="font-heading text-xl tracking-tight text-white sm:text-2xl">Georgetown Alum</h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading Georgetown Alum…</p>
      </main>
    </div>
  );
}
