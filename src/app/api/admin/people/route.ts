import { NextResponse } from "next/server";
import {
  countUnverifiedPeople,
  createPerson,
  listPeopleForAdmin,
} from "@/lib/people-admin";
import { ensurePersonColumns } from "@/lib/people-schema";
import { isPersonKind, normalizePersonKind } from "@/lib/person-kind";
import { ensurePortalTables } from "@/lib/portal-schema";
import { requirePlatformRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requirePlatformRole(["admin"]);
  await ensurePersonColumns();
  await ensurePortalTables();
  const url = new URL(request.url);
  const unverifiedOnly = url.searchParams.get("unverified") === "1";
  const people = await listPeopleForAdmin({ unverifiedOnly, limit: 150 });
  const pending = await countUnverifiedPeople();
  return NextResponse.json({ people, pending });
}

export async function POST(request: Request) {
  const viewer = await requirePlatformRole(["admin"]);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const lastName = typeof body.lastName === "string" ? body.lastName : "";
  if (!lastName.trim()) {
    return NextResponse.json({ error: "Last name is required." }, { status: 400 });
  }

  const personKind = normalizePersonKind(body.personKind ?? body.kind);
  if (!isPersonKind(personKind)) {
    return NextResponse.json(
      { error: "personKind must be alum, supporter, or development." },
      { status: 400 },
    );
  }

  try {
    const person = await createPerson({
      firstName: typeof body.firstName === "string" ? body.firstName : undefined,
      lastName,
      preferredName: typeof body.preferredName === "string" ? body.preferredName : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      currentCity: typeof body.currentCity === "string" ? body.currentCity : undefined,
      currentState: typeof body.currentState === "string" ? body.currentState : undefined,
      hometownCity: typeof body.hometownCity === "string" ? body.hometownCity : undefined,
      hometownState: typeof body.hometownState === "string" ? body.hometownState : undefined,
      classYear: typeof body.classYear === "string" ? body.classYear : undefined,
      position: typeof body.position === "string" ? body.position : undefined,
      personKind,
      username: typeof body.username === "string" ? body.username : undefined,
      password: typeof body.password === "string" ? body.password : undefined,
      verified: body.verified !== false && body.verified !== "0",
      verifiedBy: viewer.label || "Admin",
    });
    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create person." },
      { status: 400 },
    );
  }
}
