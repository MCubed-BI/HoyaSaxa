import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";

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

/** Legacy alumni login URL — central sign-in lives at /login. */
export default async function AlumniLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const dest = new URLSearchParams();
  const next = safeNextPath(params.next);
  if (next) dest.set("next", next);
  if (params.error) dest.set("error", "1");
  const query = dest.toString();
  redirect(query ? `/login?${query}` : "/login");
}
