import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALUMNI_SESSION_COOKIE, isValidAlumniSessionToken } from "@/lib/alumni-auth";

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/me";
  if (value === "/login" || value.startsWith("/api/")) return "/me";
  return value;
}

export default async function AlumniLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  if (isValidAlumniSessionToken(jar.get(ALUMNI_SESSION_COOKIE)?.value)) {
    redirect(safeNextPath(params.next));
  }

  return (
    <AuthShell title="Alumni login" subtitle="Sign in to edit your records or merge duplicate roster rows.">
      <form action="/api/alumni/login" method="post" className="space-y-4">
        <input type="hidden" name="next" value={safeNextPath(params.next)} />
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {params.error ? (
          <p className="text-sm text-destructive">That email or password is not recognized.</p>
        ) : (
          <p className="text-sm text-muted-foreground">This login is for alumni only. Coach access stays on the staff page.</p>
        )}
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link href="/register" className="text-navy underline-offset-4 hover:underline">
          Register myself
        </Link>
        {" · "}
        <Link href="/login" className="text-navy underline-offset-4 hover:underline">
          Coach login
        </Link>
      </p>
    </AuthShell>
  );
}
