import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveCookieAccess } from "@/lib/access";
import { alumModeCapabilities } from "@/lib/platform-roles";
import { readSessionInfo } from "@/lib/session";
import { getCurrentViewer } from "@/lib/viewer";

/** Portal detect: GET /api/session and read `alum` / `role === "alum"`. Prefer `isAlumLoggedIn` from `@/lib/alum-session`. */
export async function GET() {
  const jar = await cookies();
  const info = readSessionInfo(jar);
  const access = resolveCookieAccess({ get: (name) => jar.get(name) });
  const viewer = await getCurrentViewer().catch(() => null);
  const platformRole = viewer?.platformRole ?? info.platformRole ?? access?.mode ?? null;
  const capabilities = platformRole ? alumModeCapabilities(platformRole) : null;
  return NextResponse.json({
    ...info,
    platformRole,
    admin: platformRole === "admin",
    mode: platformRole,
    verifiedHoya: viewer?.verifiedHoya ?? Boolean(access?.verifiedHoya),
    accessRole: access?.role ?? info.role,
    ...capabilities,
  });
}
