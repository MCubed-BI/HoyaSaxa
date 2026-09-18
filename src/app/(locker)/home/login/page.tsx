import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LockerHeader } from "@/components/locker-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { HOYA_ALUM_SESSION_COOKIE, isValidHoyaAlumSession } from "@/lib/hoya-alum-session";

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  if (value === "/home/login") return "/home";
  return value;
}

export default async function LockerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  if (
    isValidHoyaAlumSession(jar.get(HOYA_ALUM_SESSION_COOKIE)?.value) ||
    isValidSessionToken(jar.get(SESSION_COOKIE)?.value)
  ) {
    redirect(safeNextPath(params.next));
  }

  return (
    <div className="flex min-h-full flex-col">
      <LockerHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="bg-navy px-6 py-8 text-white">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
              Georgetown Football
            </p>
            <h1 className="mt-1 font-heading text-3xl">Home / Newsflash</h1>
            <p className="mt-2 text-sm text-white/70">
              Board (Lars) can publish Newsflash. Alumni can read Home, For You, and Newsflash.
            </p>
          </div>
          <form action="/api/locker/login" method="post" className="space-y-4 px-6 py-6">
            <input type="hidden" name="next" value={safeNextPath(params.next)} />
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                required
                defaultValue="Lars"
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
              />
            </div>
            {params.error ? (
              <p className="text-sm text-destructive">That username or password is not recognized.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Demo: <code>Lars</code> (board) or <code>Alum</code> (read). Password matches the
                shared staff default unless <code>HOYA_BOARD_PASSWORD</code> /{" "}
                <code>HOYA_ALUM_PASSWORD</code> is set. Sets <code>hoya_alum_session</code>.
              </p>
            )}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Staff CRM lives at{" "}
              <Link href="/login" className="underline underline-offset-2">
                coach login
              </Link>
              . Claim/register is a separate lane.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
