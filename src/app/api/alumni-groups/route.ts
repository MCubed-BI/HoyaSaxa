import { NextResponse } from "next/server";
import { createAlumniGroup, listAlumniGroups } from "@/lib/alumni-groups";
import { getBlastActor, normalizeBlastIds } from "@/lib/blast-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await getBlastActor();
    if (!actor || actor.kind !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const groups = await listAlumniGroups();
    return NextResponse.json({ groups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list groups";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getBlastActor();
    if (!actor || actor.kind !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      memberIds?: string[];
    };
    const group = await createAlumniGroup({
      name: body.name ?? "",
      description: body.description,
      createdBy: actor.label,
      memberIds: normalizeBlastIds(body.memberIds),
    });
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create group";
    const status = message.includes("required") || message.includes("too long") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
