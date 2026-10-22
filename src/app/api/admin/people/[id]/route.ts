import { NextResponse } from "next/server";
import { setPersonKind, setPersonVerified } from "@/lib/people-admin";
import { isPersonKind, normalizePersonKind } from "@/lib/person-kind";
import { requirePlatformRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const viewer = await requirePlatformRole(["admin"]);
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing person id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let person = null;
  if (typeof body.verified === "boolean") {
    person = await setPersonVerified(id, body.verified, viewer.label || "Admin");
  }
  if (body.personKind != null || body.kind != null) {
    const kind = normalizePersonKind(body.personKind ?? body.kind);
    if (!isPersonKind(kind)) {
      return NextResponse.json({ error: "personKind must be alum or supporter." }, { status: 400 });
    }
    person = await setPersonKind(id, kind);
  }

  if (!person) {
    return NextResponse.json({ error: "Person not found or nothing to update." }, { status: 404 });
  }
  return NextResponse.json({ person });
}
