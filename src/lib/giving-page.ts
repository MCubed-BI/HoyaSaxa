import { isMissingDatabaseConfig } from "@/lib/db";
import { emptyGivingSummary, listGivingSummary, type GivingSummary } from "@/lib/giving";
import { getLockerViewer, type LockerViewer } from "@/lib/locker-viewer";
import { canOpenGiving } from "@/lib/roles";
import { getCurrentViewer, type Viewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export async function loadGivingPageContext() {
  const [viewer, locker] = await Promise.all([getCurrentViewer(), getLockerViewer()]);

  if (!viewer || !canOpenGiving(viewer.role)) {
    redirect("/home/login");
  }

  let summary: GivingSummary = emptyGivingSummary;
  let errorMessage: string | null = null;

  try {
    summary = await listGivingSummary();
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load pledges.";
  }

  const alumDonorLabel =
    locker && locker.source !== "ga_session" && locker.label ? locker.label : undefined;

  return {
    viewer: viewer as Viewer,
    locker: locker as LockerViewer | null,
    summary,
    errorMessage,
    alumDonorLabel,
  };
}
