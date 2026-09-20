import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SESSION_COOKIE, getCoachCredentials, getSessionUsername } from "@/lib/auth";
import { homePathForRole, resolveRoleFromEnv } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Admin login",
};

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const staffUsername = getSessionUsername(jar.get(SESSION_COOKIE)?.value);
  if (staffUsername) {
    const role = resolveRoleFromEnv(staffUsername, getCoachCredentials().username);
    redirect(safeNextPath(params.next) || homePathForRole(role));
  }

  return (
    <AuthShell title="Admin login" subtitle="Alum or Admin only.">
      <form action="/api/login" method="post" className="space-y-4">
        <input type="hidden" name="next" value={safeNextPath(params.next)} />
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            className="h-10"
          />
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
        {params.error ? (
          <p className="text-sm text-destructive">That username or password is not recognized.</p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter the username and password issued to you.
          </p>
        )}
        <Button type="submit" className="h-10 w-full">
          Sign in
        </Button>
        <div className="flex flex-col items-center gap-1 pt-1 text-sm">
          <Link href="/register" className="text-navy underline-offset-4 hover:underline">
            Register myself
          </Link>
          <Link href="/alumni-login" className="text-muted-foreground underline-offset-4 hover:underline">
            Alumni login
          </Link>
          <p className="pt-1 text-center text-muted-foreground">
            Alumni portal:{" "}
            <Link href="/home/login" className="text-navy underline-offset-4 hover:underline">
              Home
            </Link>
            {" · "}
            <Link href="/locker" className="text-navy underline-offset-4 hover:underline">
              Messages
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
