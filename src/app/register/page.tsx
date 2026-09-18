import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { RegisterMyself } from "@/components/register-myself";
import { ALUMNI_SESSION_COOKIE, isValidAlumniSessionToken } from "@/lib/alumni-auth";

export default async function RegisterPage() {
  const jar = await cookies();
  if (isValidAlumniSessionToken(jar.get(ALUMNI_SESSION_COOKIE)?.value)) {
    redirect("/me");
  }

  return (
    <AuthShell
      title="Register myself"
      subtitle="Claim your roster row with last name and graduating class, then create an alumni login."
    >
      <RegisterMyself />
      <p className="text-center text-sm text-muted-foreground">
        Coaching staff?{" "}
        <Link href="/login" className="text-navy underline-offset-4 hover:underline">
          Coach login
        </Link>
      </p>
    </AuthShell>
  );
}
