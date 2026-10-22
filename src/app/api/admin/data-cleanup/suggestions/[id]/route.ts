import { NextResponse } from "next/server";
import { decideCleanupSuggestion } from "@/lib/data-cleanup";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getCurrentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getCurrentViewer();
  if (!viewer || viewer.platformRole !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { action?: "approve" | "reject" };
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "Choose approve or reject." }, { status: 400 });
  }

  try {
    const result = await decideCleanupSuggestion({
      id,
      action: body.action,
      decidedBy: viewer.label || viewer.username || "admin",
      accountId: viewer.accountId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update suggestion" },
      { status: 400 },
    );
  }
}
