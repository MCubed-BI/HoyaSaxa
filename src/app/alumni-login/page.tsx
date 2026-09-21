import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAlumLoggedIn } from "@/lib/alum-session";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";

export const metadata: Metadata = {
  title: "Alumni login",
};

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  if (value === "/login" || value.startsWith("/api/")) return "/home";
  return value;
}

export default async function AlumniLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  if (isAlumLoggedIn(jar)) {
    redirect(safeNextPath(params.next));
  }

  return (
    <AuthShell
      title="Alumni login"
      subtitle={`Alum or Admin only. Sign in to ${PRODUCT_DISPLAY_NAME} — For You, Directory, and your record.`}
    >
      <form action="/api/alumni/login" method="post" className="space-y-4">
        <input type="hidden" name="next" value={safeNextPath(params.next)} />
        <div className="space-y-1.5">
          <Label htmlFor="identifier">GTown NetID or email</Label>
          <Input id="identifier" name="identifier" type="text" autoComplete="username" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {params.error ? (
          <p className="text-sm text-destructive">That GTown NetID, email, or password is not recognized.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Use your GTown NetID or the email from Register myself. Portal usernames stay on Alum | Admin.
          </p>
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
        <Link href="/home/login" className="text-navy underline-offset-4 hover:underline">
          Alum | Admin
        </Link>
      </p>
    </AuthShell>
  );
}
