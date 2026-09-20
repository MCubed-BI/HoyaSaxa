import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveCookieAccess } from "@/lib/access";
import { readSessionInfo } from "@/lib/session";

/** Portal detect: GET /api/session and read `alum` / `role === "alum"`. Prefer `isAlumLoggedIn` from `@/lib/alum-session`. */
export async function GET() {
  const jar = await cookies();
  const info = readSessionInfo(jar);
  const access = resolveCookieAccess({ get: (name) => jar.get(name) });
  return NextResponse.json({
    ...info,
    mode: access?.mode ?? null,
    verifiedHoya: Boolean(access?.verifiedHoya),
    accessRole: access?.role ?? info.role,
  });
}
