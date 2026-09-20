import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginGate, type LoginGateMode } from "@/components/login-gate";
import { SESSION_COOKIE, getCoachCredentials, getSessionUsername } from "@/lib/auth";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";
import { homePathForRole, resolveRoleFromEnv } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to ${PRODUCT_DISPLAY_NAME}.`,
};

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}

function parseGate(value: string | undefined): LoginGateMode {
  return value === "alum" ? "alum" : "admin";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; gate?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const staffUsername = getSessionUsername(jar.get(SESSION_COOKIE)?.value);
  if (staffUsername) {
    const role = resolveRoleFromEnv(staffUsername, getCoachCredentials().username);
    redirect(safeNextPath(params.next) || homePathForRole(role));
  }

  return (
    <LoginGate
      pathname="/login"
      mode={parseGate(params.gate)}
      next={safeNextPath(params.next) || undefined}
      error={Boolean(params.error)}
    />
  );
}
