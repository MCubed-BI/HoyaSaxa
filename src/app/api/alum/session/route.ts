import { NextResponse } from "next/server";
import { readAlumSession } from "@/lib/alum-session";

export async function GET(request: Request) {
  const session = readAlumSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ session });
}
