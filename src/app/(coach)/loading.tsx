import { AppHeader } from "@/components/app-header";

export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader current="directory" />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading Georgetown Alum…</p>
      </main>
    </div>
  );
}
