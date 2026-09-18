import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionInfo } from "@/lib/session";

/** Portal detect: GET /api/session and read `alum` / `role === "alum"`. Prefer `isAlumLoggedIn` from `@/lib/alum-session`. */
export async function GET() {
  const info = readSessionInfo(await cookies());
  return NextResponse.json(info);
}
