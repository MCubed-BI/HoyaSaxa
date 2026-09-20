import { BoardMemberToggle } from "@/components/board-member-toggle";
import { AppHeader } from "@/components/app-header";
import { LockerHeader } from "@/components/locker-header";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getLockerViewer } from "@/lib/locker-viewer";
import { listBoardMembers } from "@/lib/staff-roles";
import { requirePlatformRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function AdminBoardPage() {
  const viewer = await requirePlatformRole(["admin"]);
  const locker = await getLockerViewer();
  let members: Awaited<ReturnType<typeof listBoardMembers>> = [];
  let loadError: string | null = null;
  try {
    members = await listBoardMembers();
  } catch (error) {
    loadError = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set."
      : error instanceof Error
        ? error.message
        : "Board grants could not be loaded.";
  }

  return (
    <PageShell>
      {locker && locker.source !== "ga_session" ? (
        <LockerHeader current="admin" viewer={locker} />
      ) : (
        <AppHeader current="admin" role={viewer.role} viewerLabel={viewer.label} />
      )}
      <PageMain>
        <PageHeader
          eyebrow="Admin portal"
          title="Board grants"
          description="Toggle Board member on a claimed roster row. Board gets Alum Mode plus Message from the Board. From Sgarlata stays Admin only."
        />
        <StatusCard
          title="How Admin grants Board"
          body="Open a directory / athlete profile and use Board member, or toggle a current grant below. The grant is stored on staff_roles (alumni_id + role=board), not env-only. It applies on the next page load via the platform role overlay. Sign-out is not required. Admin accounts cannot be demoted here."
        />
        {loadError ? <StatusCard title="Board list unavailable" body={loadError} /> : null}
        {members.length === 0 && !loadError ? (
          <StatusCard title="No Board members yet" body="Open an athlete profile from the directory and grant Board member." />
        ) : (
          <div className="space-y-3">
            {members.map((row) =>
              row.alumni_id ? (
                <BoardMemberToggle
                  key={row.id}
                  alumniId={row.alumni_id}
                  name={row.username || row.email || row.alumni_id}
                  granted
                />
              ) : (
                <p key={row.id} className="rounded-xl border px-4 py-3 text-sm text-muted-foreground">
                  {row.username || row.email || "Board"} — env/username grant (no roster id).
                </p>
              ),
            )}
          </div>
        )}
      </PageMain>
    </PageShell>
  );
}
