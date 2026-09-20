import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  wide = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <div
        className={`w-full overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-elevated)] ${
          wide ? "max-w-[520px]" : "max-w-[420px]"
        }`}
      >
        <div className="space-y-4 overflow-visible px-6 pt-7 sm:px-8">
          <BrandMark href="/" eyebrow={eyebrow} />
          <div>
            <h1 className="font-heading text-[1.75rem] leading-tight text-navy">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div className="space-y-4 px-6 py-6 sm:px-8">{children}</div>
      </div>
    </main>
  );
}
