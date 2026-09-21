import { NextResponse } from "next/server";
import { getLockerViewer } from "@/lib/locker-viewer";
import { isMissingDatabaseConfig } from "@/lib/db";
import {
  isStrongSingleMatch,
  suggestFromAlumniRows,
  suggestFromLockerPeople,
  suggestFromLockerStubs,
  type DirectorySearchView,
} from "@/lib/directory-search";
import { searchLockerDirectory } from "@/lib/locker-directory";
import { searchAlumniByName } from "@/lib/queries";
import { getCurrentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

function parseView(value: string | null): DirectorySearchView {
  return value === "alum" ? "alum" : "admin";
}

export async function GET(request: Request) {
  const viewer = (await getCurrentViewer()) ?? (await getLockerViewer());
  if (!viewer) {
    return NextResponse.json({ error: "Sign in to search the directory." }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const view = parseView(url.searchParams.get("view"));
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "8", 10);

  if (q.length < 1) {
    return NextResponse.json({ q, people: [], single: false });
  }

  try {
    if (view === "alum") {
      const result = await searchLockerDirectory({ q, page: 1 });
      const people = result.usingSample
        ? suggestFromLockerStubs(q, limit)
        : suggestFromLockerPeople(result.rows, q, limit);
      return NextResponse.json({ q, people, single: isStrongSingleMatch(people) });
    }

    const rows = await searchAlumniByName(q, Number.isFinite(limit) ? limit : 8);
    const people = suggestFromAlumniRows(rows, q, "admin", Number.isFinite(limit) ? limit : 8);
    return NextResponse.json({ q, people, single: isStrongSingleMatch(people) });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      const people = view === "alum" ? suggestFromLockerStubs(q, limit) : [];
      return NextResponse.json({ q, people, single: isStrongSingleMatch(people), usingSample: true });
    }
    const message = error instanceof Error ? error.message : "Could not search the directory.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
