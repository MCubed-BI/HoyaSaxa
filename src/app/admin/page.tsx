import { AdminMasterPanel } from "@/components/admin-master-panel";
import { AppHeader } from "@/components/app-header";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listAdminMembers, listBoardMembers } from "@/lib/staff-roles";
import { requirePlatformRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function AdminMasterPage() {
  const viewer = await requirePlatformRole(["admin"]);
  let admins: Awaited<ReturnType<typeof listAdminMembers>> = [];
  let board: Awaited<ReturnType<typeof listBoardMembers>> = [];
  let loadError: string | null = null;
  try {
    [admins, board] = await Promise.all([listAdminMembers(), listBoardMembers()]);
  } catch (error) {
    loadError = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set."
      : error instanceof Error
        ? error.message
        : "Admin grants could not be loaded.";
  }

  return (
    <PageShell>
      <AppHeader current="admin" role={viewer.role} viewerLabel={viewer.label} verifiedHoya={viewer.verifiedHoya} />
      <PageMain>
        <PageHeader
          eyebrow="Admin"
          title="Admin master"
          description="One central login for everyone. Grant Admin here so other users get full admin rights when they sign in with username/Net ID and password."
        />
        <StatusCard
          title="How Admin works"
          body="Sign-in is username or GTown Net ID plus password at /login. Seeded and granted Admins automatically receive a staff session with admin rights. Use the search below to add roster people as Admin. Board grants remain available for Message from the Board without full Admin."
        />
        {loadError ? (
          <StatusCard title="Admin list unavailable" body={loadError} />
        ) : (
          <AdminMasterPanel initialAdmins={admins} initialBoard={board} />
        )}
      </PageMain>
    </PageShell>
  );
}
