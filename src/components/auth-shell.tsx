import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-navy px-6 py-8 text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
            {eyebrow ?? "Georgetown Football"}
          </p>
          <h1 className="mt-1 font-heading text-3xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-white/70">{subtitle}</p> : null}
        </div>
        <div className="space-y-4 px-6 py-6">{children}</div>
      </div>
    </main>
  );
}
