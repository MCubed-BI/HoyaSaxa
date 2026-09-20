import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { RegisterMyself } from "@/components/register-myself";
import { isAlumLoggedIn } from "@/lib/alum-session";

export const metadata: Metadata = {
  title: "Register myself",
};

export default async function RegisterPage() {
  const jar = await cookies();
  if (isAlumLoggedIn(jar)) {
    redirect("/me");
  }

  return (
    <AuthShell
      title="Register myself"
      subtitle="Claim your roster row with last name and graduating class, then create an alumni login."
    >
      <RegisterMyself />
      <p className="text-center text-sm text-muted-foreground">
        Admin?{" "}
        <Link href="/login" className="text-navy underline-offset-4 hover:underline">
          Admin login
        </Link>
      </p>
    </AuthShell>
  );
}
