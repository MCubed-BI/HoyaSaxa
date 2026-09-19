import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand";

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
    <main className="auth-canvas flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-elevated)]">
        <div className="space-y-4 px-6 pt-7 sm:px-8">
          <BrandMark href="/" eyebrow={eyebrow ?? "Georgetown Football"} />
          <div>
            <h1 className="font-heading text-[1.85rem] leading-none text-navy">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div className="space-y-4 px-6 py-6 sm:px-8">{children}</div>
      </div>
    </main>
  );
}
