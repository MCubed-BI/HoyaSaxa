import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionInfo } from "@/lib/session";

export async function GET() {
  const info = readSessionInfo(await cookies());
  return NextResponse.json(info);
}
