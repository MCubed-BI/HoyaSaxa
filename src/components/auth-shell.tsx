import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";

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
    <main className="auth-shell">
      <div className="auth-shell__field" aria-hidden="true" />
      <div className={wide ? "auth-shell__card auth-shell__card--wide" : "auth-shell__card"}>
        <div className="auth-shell__brand auth-shell__brand--mark overflow-visible">
          <BrandMark href="/" eyebrow={eyebrow} prominent inverted />
          <p className="sr-only">{PRODUCT_DISPLAY_NAME}</p>
        </div>
        <div className="auth-shell__copy">
          <h1 className="auth-shell__title">{title}</h1>
          {subtitle ? <p className="auth-shell__subtitle">{subtitle}</p> : null}
        </div>
        <div className="auth-shell__body">{children}</div>
      </div>
    </main>
  );
}
