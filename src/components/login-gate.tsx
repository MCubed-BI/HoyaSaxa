import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";

/** @deprecated Mode tabs removed — central login is username/Net ID + password. */
export type LoginGateMode = "alum" | "admin";

export function LoginGate({
  next,
  error,
  action = "/api/login",
}: {
  /** Ignored — kept for call-site compatibility. */
  pathname?: string;
  /** Ignored — kept for call-site compatibility. */
  mode?: LoginGateMode;
  next?: string;
  error?: boolean;
  action?: string;
}) {
  return (
    <AuthShell
      title="Sign in"
      subtitle={`One login for ${PRODUCT_DISPLAY_NAME}. Admins get admin rights automatically.`}
    >
      <form action={action} method="post" className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div className="space-y-1.5">
          <Label htmlFor="username">Username / Net ID</Label>
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
            That username, Net ID, or password is not recognized.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter your username or GTown Net ID and password.
          </p>
        )}
        <Button type="submit" className="h-10 w-full">
          Sign in
        </Button>
        <Button asChild type="button" variant="outline" className="h-10 w-full">
          <Link href="/register?forgot=1">Forgot Password</Link>
        </Button>
      </form>

      <p className="pt-1 text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link href="/register" className="text-navy underline-offset-4 hover:underline">
          Register myself
        </Link>
      </p>
    </AuthShell>
  );
}
