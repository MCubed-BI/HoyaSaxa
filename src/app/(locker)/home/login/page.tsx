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
    <>
      <LockerHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gold/25 bg-card shadow-sm">
          <div className="bg-navy px-6 py-8 text-white">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold">
              Hoya Football
            </p>
            <h1 className="mt-1 font-heading text-3xl">Legacy Locker</h1>
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
                className="border-white/20 bg-navy/30 text-white"
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
                className="border-white/20 bg-navy/30 text-white"
              />
            </div>
            {params.error ? (
              <p className="text-sm text-destructive">That locker username or password is not recognized.</p>
            ) : (
              <p className="text-sm text-white/60">
                Demo: <code className="text-gold">Lars</code> (board) or <code className="text-gold">Alum</code>{" "}
                (read). Password matches the shared staff default unless{" "}
                <code className="text-gold">HOYA_BOARD_PASSWORD</code> /{" "}
                <code className="text-gold">HOYA_ALUM_PASSWORD</code> is set. Sets{" "}
                <code className="text-gold">hoya_alum_session</code>.
              </p>
            )}
            <Button type="submit" className="w-full bg-gold text-navy hover:bg-gold/90">
              Enter locker
            </Button>
            <p className="text-center text-xs text-white/45">
              Staff CRM lives at{" "}
              <Link href="/login" className="text-gold hover:underline">
                coach login
              </Link>
              . Claim/register is a separate lane.
            </p>
          </form>
        </div>
      </main>
    </>
  );
}
