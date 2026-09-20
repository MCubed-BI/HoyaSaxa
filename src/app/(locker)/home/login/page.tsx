import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLockerViewer } from "@/lib/locker-viewer";

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
  const viewer = await getLockerViewer();
  if (viewer) {
    redirect(safeNextPath(params.next));
  }

  return (
    <AuthShell
      title="Alumni portal"
      subtitle="Admin seed (Lars, Sgarlata, Mike) see/post all. Board can post everything except From Sgarlata. Alumni can edit self and post Brothers on For You."
    >
      <form action="/api/locker/login" method="post" className="space-y-4">
        <input type="hidden" name="next" value={safeNextPath(params.next)} />
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            defaultValue="Lars"
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
            Demo: <code>Lars</code> / <code>Sgarlata</code> / <code>Mike</code> (Admin), <code>Board</code>{" "}
            (Board Mode), or <code>Alum</code> (Alum Mode). Password matches the shared staff default unless{" "}
            <code>HOYA_BOARD_PASSWORD</code> / <code>HOYA_ALUM_PASSWORD</code> is set.
          </p>
        )}
        <Button type="submit" className="h-10 w-full">
          Sign in
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Staff CRM lives at{" "}
          <Link href="/login" className="text-navy underline-offset-4 hover:underline">
            coach login
          </Link>
          . Claim/register is a separate lane.
        </p>
      </form>
    </AuthShell>
  );
}
