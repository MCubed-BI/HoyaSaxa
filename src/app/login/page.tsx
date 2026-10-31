import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginGate } from "@/components/login-gate";
import { SESSION_COOKIE, getCoachCredentials, getSessionUsername } from "@/lib/auth";
import { isAlumLoggedIn } from "@/lib/alum-session";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";
import { homePathForRole, resolveRoleFromEnv } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to ${PRODUCT_DISPLAY_NAME}.`,
};

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  if (value === "/login" || value === "/home/login" || value === "/alumni-login") return "";
  if (value.startsWith("/api/")) return "";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const next = safeNextPath(params.next);
  const staffUsername = getSessionUsername(jar.get(SESSION_COOKIE)?.value);
  if (staffUsername) {
    const role = resolveRoleFromEnv(staffUsername, getCoachCredentials().username);
    redirect(next || homePathForRole(role));
  }
  if (isAlumLoggedIn(jar)) {
    redirect(next || "/home");
  }

  return <LoginGate next={next || undefined} error={Boolean(params.error)} />;
}
