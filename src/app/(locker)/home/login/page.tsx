import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginGate, type LoginGateMode } from "@/components/login-gate";
import { getLockerViewer } from "@/lib/locker-viewer";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to ${PRODUCT_DISPLAY_NAME}.`,
};

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  if (value === "/home/login") return "/home";
  return value;
}

function parseGate(value: string | undefined): LoginGateMode {
  return value === "admin" ? "admin" : "alum";
}

export default async function LockerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; gate?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getLockerViewer();
  if (viewer) {
    redirect(safeNextPath(params.next));
  }

  return (
    <LoginGate
      pathname="/home/login"
      mode={parseGate(params.gate)}
      next={safeNextPath(params.next)}
      error={Boolean(params.error)}
    />
  );
}
