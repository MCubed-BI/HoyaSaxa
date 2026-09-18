import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALUMNI_SESSION_COOKIE, isValidAlumniSessionToken } from "@/lib/alumni-auth";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/portal";
  if (value === "/login" || value.startsWith("/api/")) return "/portal";
  return value;
}

export default async function AlumniLoginHookPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  if (isValidAlumniSessionToken(jar.get(ALUMNI_SESSION_COOKIE)?.value)) {
    redirect(safeNextPath(params.next));
  }
  if (isValidSessionToken(jar.get(SESSION_COOKIE)?.value)) {
    redirect("/portal");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-navy px-6 py-8 text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
            Georgetown Football
          </p>
          <h1 className="mt-1 font-heading text-3xl">Alumni login</h1>
          <p className="mt-2 text-sm text-white/70">
            Claimed alumni sessions from Register/Claim land here, then open the alum portal.
          </p>
        </div>
        <form action="/api/alumni/login" method="post" className="space-y-4 px-6 py-6">
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
            <p className="text-sm text-muted-foreground">
              This form posts to <code>/api/alumni/login</code>, owned by the Register/Claim branch.
              Until that auth is merged, preview the alumnus shell with staff username <strong>Alum</strong>{" "}
              on the coach login.
            </p>
          )}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
          <div className="flex flex-col items-center gap-1 pt-1 text-sm">
            <Link href="/register" className="text-navy underline-offset-4 hover:underline">
              Register myself
            </Link>
            <Link href="/login" className="text-muted-foreground underline-offset-4 hover:underline">
              Staff login
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
