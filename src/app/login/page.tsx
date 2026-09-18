import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  if (isValidSessionToken(jar.get(SESSION_COOKIE)?.value)) {
    redirect(safeNextPath(params.next));
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-navy px-6 py-8 text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
            Georgetown Football
          </p>
          <h1 className="mt-1 font-heading text-3xl">Georgetown Alum</h1>
          <p className="mt-2 text-sm text-white/70">Coach access for Head Coach Sgarlata</p>
        </div>
        <form action="/api/login" method="post" className="space-y-4 px-6 py-6">
          <input type="hidden" name="next" value={safeNextPath(params.next)} />
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" autoComplete="username" required defaultValue="Hoyas" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {params.error ? (
            <p className="text-sm text-destructive">That username or password is not recognized.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Shared staff login. Do not share alumni lists outside the coaching staff.
            </p>
          )}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Alumni locker (Home / For You / Newsflash) is a separate session at{" "}
            <a href="/home/login" className="underline underline-offset-2">
              /home/login
            </a>
            .
          </p>
        </form>
      </div>
    </main>
  );
}
