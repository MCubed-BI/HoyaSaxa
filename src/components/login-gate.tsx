import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";
import { cn } from "cn";

export type LoginGateMode = "alum" | "admin";

function gateHref(pathname: string, mode: LoginGateMode, next?: string) {
  const params = new URLSearchParams();
  params.set("gate", mode);
  if (next) params.set("next", next);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function LoginGate({
  pathname,
  mode,
  next,
  error,
}: {
  pathname: string;
  mode: LoginGateMode;
  next?: string;
  error?: boolean;
}) {
  const isAlum = mode === "alum";
  const action = isAlum ? "/api/locker/login" : "/api/login";
  const subtitle = isAlum
    ? `Alumni sign-in for ${PRODUCT_DISPLAY_NAME}.`
    : `Admin sign-in for ${PRODUCT_DISPLAY_NAME}.`;

  return (
    <AuthShell title="Sign in" subtitle={subtitle}>
      <div className="login-gate">
        <div className="login-gate__tabs" role="tablist" aria-label="Sign-in mode">
          <Link
            href={gateHref(pathname, "alum", next)}
            role="tab"
            aria-selected={isAlum}
            className={cn("login-gate__tab", isAlum && "is-active")}
          >
            Alum
          </Link>
          <Link
            href={gateHref(pathname, "admin", next)}
            role="tab"
            aria-selected={!isAlum}
            className={cn("login-gate__tab", !isAlum && "is-active")}
          >
            Admin
          </Link>
        </div>

        <form action={action} method="post" className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="username">{isAlum ? "GTown NetID or email" : "Username"}</Label>
            <Input id="username" name="username" autoComplete="username" required className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-10"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">
              {isAlum
                ? "That GTown NetID, email, or password is not recognized."
                : "That username or password is not recognized."}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isAlum
                ? "Use your GTown NetID or the email from Register myself."
                : "Enter the username and password issued to you."}
            </p>
          )}
          <Button type="submit" className="h-10 w-full">
            Sign in
          </Button>
        </form>

        <div className="flex flex-col items-center gap-1 pt-1 text-sm">
          {isAlum ? (
            <>
              <Link href="/register" className="text-navy underline-offset-4 hover:underline">
                Register myself
              </Link>
              <Link href="/alumni-login" className="text-muted-foreground underline-offset-4 hover:underline">
                Claimed record login
              </Link>
            </>
          ) : (
            <Link href="/register" className="text-muted-foreground underline-offset-4 hover:underline">
              Register myself
            </Link>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
