import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";

export const metadata: Metadata = {
  title: "Alumni messages",
};

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
    <AuthShell
      title="Alumni messages"
      subtitle="Enter the alumni access code to read Messages. This is not Register myself."
    >
      <form action="/api/messages/alum-session" method="post" className="space-y-4">
        <input type="hidden" name="next" value={safeNextPath(params.next)} />
        <div className="space-y-1.5">
          <Label htmlFor="email">Email (optional label)</Label>
          <Input id="email" name="email" type="email" autoComplete="email" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="access_code">Access code</Label>
          <Input
            id="access_code"
            name="access_code"
            type="password"
            autoComplete="current-password"
            required
            className="h-10"
          />
        </div>
        {params.error ? (
          <p className="text-sm text-destructive">That access code is not recognized.</p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Admins still sign in at Admin login to post.
          </p>
        )}
        <Button type="submit" className="h-10 w-full">
          Open messages
        </Button>
      </form>
    </AuthShell>
  );
}
