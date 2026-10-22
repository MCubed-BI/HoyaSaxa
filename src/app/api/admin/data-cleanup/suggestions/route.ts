import { NextResponse } from "next/server";
import {
  listCleanupSuggestions,
  scanCleanupSuggestions,
  type CleanupSuggestionStatus,
} from "@/lib/data-cleanup";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getCurrentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer || viewer.platformRole !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const statusParam = new URL(request.url).searchParams.get("status") || "pending";
    const status = (["pending", "approved", "rejected", "all"].includes(statusParam)
      ? statusParam
      : "pending") as CleanupSuggestionStatus | "all";
    const suggestions = await listCleanupSuggestions(status);
    return NextResponse.json({ suggestions });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load suggestions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer || viewer.platformRole !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { useAi?: boolean };
    const result = await scanCleanupSuggestions({ useAi: body.useAi !== false });
    const suggestions = await listCleanupSuggestions("pending");
    return NextResponse.json({ ...result, suggestions });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 },
    );
  }
}
