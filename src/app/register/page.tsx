import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { RegisterMyself } from "@/components/register-myself";
import { getAlumSession, isAlumLoggedIn } from "@/lib/alum-session";
import { isClaimPhotoValidateStep } from "@/lib/claim-photos";

export const metadata: Metadata = {
  title: "Register myself",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const session = getAlumSession(jar);
  const validate = isClaimPhotoValidateStep(params.validate, params.step, params.photos);
  if (isAlumLoggedIn(jar) && !(validate && session?.alumniId)) {
    redirect("/home");
  }

  return (
    <AuthShell
      wide
      title={validate ? "Validate photos" : "Register myself"}
      subtitle={
        validate
          ? "Upload or paste image URLs for your football roster photo and LinkedIn headshot, then save before you finish."
          : "Claim your roster row, add or replace photos, then create an alumni login."
      }
    >
      <RegisterMyself
        initialStep={validate && session?.alumniId ? "photos" : "roster"}
        claimedAlumniId={validate ? session?.alumniId ?? null : null}
      />
      <p className="text-center text-sm text-muted-foreground">
        Admin?{" "}
        <Link href="/login" className="text-navy underline-offset-4 hover:underline">
          Admin login
        </Link>
      </p>
    </AuthShell>
  );
}
