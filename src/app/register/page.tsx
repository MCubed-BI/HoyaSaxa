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

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const session = getAlumSession(jar);
  const validate = isClaimPhotoValidateStep(params.validate, params.step, params.photos);
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

  return (
    <AuthShell
      wide
      title={needsNetId ? "GTown NetID" : validate ? "Validate photos" : "Register myself"}
      subtitle={
        needsNetId
          ? "Add your Georgetown NetID — the part before @georgetown.edu — so you can sign in with it."
          : validate
            ? "Upload or paste image URLs for your football roster photo and LinkedIn headshot, then save before you finish."
            : `Claim your roster row in ${PRODUCT_DISPLAY_NAME}, add or replace photos, then create an alumni login.`
      }
    >
      <RegisterMyself
        initialStep={validate && session?.alumniId ? "photos" : needsNetId ? "netid" : "roster"}
        claimedAlumniId={validate ? session?.alumniId ?? null : null}
        initialEmail={initialEmail}
        initialNetId={initialNetId}
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
