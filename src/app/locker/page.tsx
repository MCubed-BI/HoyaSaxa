import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/messages";
  return value;
}

export default async function LockerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  if (isValidSessionToken(jar.get(SESSION_COOKIE)?.value)) {
    redirect(safeNextPath(params.next));
  }
  if (readAlumniSessionFromCookies((name) => jar.get(name)?.value)) {
    redirect(safeNextPath(params.next));
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-navy px-6 py-8 text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
            Georgetown Football
          </p>
          <h1 className="mt-1 font-heading text-3xl">Alumni messages</h1>
          <p className="mt-2 text-sm text-white/70">
            Sets a <code>hoya_alum_session</code> cookie so alumni can read Messages. This is not
            Register myself.
          </p>
        </div>
        <form action="/api/messages/alum-session" method="post" className="space-y-4 px-6 py-6">
          <input type="hidden" name="next" value={safeNextPath(params.next)} />
          <div className="space-y-1.5">
            <Label htmlFor="email">Email (optional label)</Label>
            <Input id="email" name="email" type="email" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="access_code">Access code</Label>
            <Input id="access_code" name="access_code" type="password" autoComplete="current-password" required />
          </div>
          {params.error ? (
            <p className="text-sm text-destructive">That access code is not recognized.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Local / demo default is HoyaSaxa. Staff still sign in at /login to post.
            </p>
          )}
          <Button type="submit" className="w-full">
            Open messages
          </Button>
        </form>
      </div>
    </main>
  );
}
