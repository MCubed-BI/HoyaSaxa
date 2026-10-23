import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getPersonLoginInfo, setSupporterLoginCredentials } from "@/lib/supporter-login";
import { requirePlatformRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  await requirePlatformRole(["admin"]);
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing person id." }, { status: 400 });
  }
  try {
    const login = await getPersonLoginInfo(id);
    if (!login) return NextResponse.json({ error: "Person not found." }, { status: 404 });
    return NextResponse.json({ login });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Could not load login.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  await requirePlatformRole(["admin"]);
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing person id." }, { status: 400 });
  }

  let body: { username?: string; password?: string; email?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string; email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const login = await setSupporterLoginCredentials({
      alumniId: id,
      username: body.username ?? "",
      password: body.password ?? "",
      email: body.email,
    });
    return NextResponse.json({ login });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Could not save login.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
