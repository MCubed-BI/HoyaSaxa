import { NextResponse } from "next/server";
import { getContactCrmSummary } from "@/lib/crm";
import { isMissingDatabaseConfig } from "@/lib/db";
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
    const crm = await getContactCrmSummary(id);
    return NextResponse.json(crm);
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
    }
    throw error;
  }
}
