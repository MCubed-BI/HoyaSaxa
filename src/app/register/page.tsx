import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { RegisterMyself } from "@/components/register-myself";
import { getAlumSession, isAlumLoggedIn } from "@/lib/alum-session";
import { loadAlumniMeState } from "@/lib/alumni-claim";
import { prefillNetId } from "@/lib/alumni-net-id";
import { isClaimPhotoValidateStep } from "@/lib/claim-photos";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";

export const metadata: Metadata = {
  title: "Register myself",
};

function flagParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.some((item) => item === "1" || item === "true");
  return value === "1" || value === "true";
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const session = getAlumSession(jar);
  const validate = isClaimPhotoValidateStep(params.validate, params.step, params.photos);
  const forgotPassword = flagParam(params.forgot);
  let needsNetId = false;
  let initialEmail = "";
  let initialNetId = "";
  if (isAlumLoggedIn(jar) && !(validate && session?.alumniId)) {
    let state: Awaited<ReturnType<typeof loadAlumniMeState>> = null;
    try {
      state = await loadAlumniMeState(jar);
    } catch {
      redirect("/home");
    }
    if (state?.account && !state.account.netId) {
      needsNetId = true;
      initialEmail = state.account.email;
      initialNetId = prefillNetId(state.account.email);
    } else {
      redirect("/home");
    }
  }

  const title = needsNetId
    ? "GTown NetID"
    : validate
      ? "Validate photos"
      : forgotPassword
        ? "Forgot password"
        : "Register myself";
  const subtitle = needsNetId
    ? "Add your Georgetown NetID — the part before @georgetown.edu — so you can sign in with it."
    : validate
      ? "Upload or paste image URLs for your football roster photo and LinkedIn headshot, then save before you finish."
      : forgotPassword
        ? `There is no email reset. Re-register with your roster details and the same alumni email to set a new password in ${PRODUCT_DISPLAY_NAME}.`
        : `Claim your roster row in ${PRODUCT_DISPLAY_NAME}, add or replace photos, then create an alumni login.`;

  return (
    <AuthShell wide title={title} subtitle={subtitle}>
      <RegisterMyself
        initialStep={validate && session?.alumniId ? "photos" : needsNetId ? "netid" : "roster"}
        claimedAlumniId={validate ? session?.alumniId ?? null : null}
        initialEmail={initialEmail}
        initialNetId={initialNetId}
        forgotPassword={forgotPassword && !needsNetId && !validate}
      />
      <p className="text-center text-sm text-muted-foreground">
        Already have access?{" "}
        <Link href="/home/login" className="text-navy underline-offset-4 hover:underline">
          Alum | Admin
        </Link>
      </p>
    </AuthShell>
  );
}
