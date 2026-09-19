import { NextResponse } from "next/server";
import { clearAllAuthCookies } from "@/lib/logout";

export const dynamic = "force-dynamic";

async function signOut(request: Request) {
  const response = NextResponse.redirect(new URL("/home/login", request.url), { status: 303 });
  clearAllAuthCookies(response);
  return response;
}

export async function POST(request: Request) {
  return signOut(request);
}

export async function GET(request: Request) {
  return signOut(request);
}
