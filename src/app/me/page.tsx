import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AlumniMePanel } from "@/components/alumni-me-panel";
import { LockerHeader } from "@/components/locker-header";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { VerifiedHoyaBadge } from "@/components/verified-hoya-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { loadAlumniMeState } from "@/lib/alumni-claim";
import { listPublicBadgesManyFromFeed } from "@/lib/badges-attendance";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const jar = await cookies();
  const viewer = await getLockerViewer();
  let state: Awaited<ReturnType<typeof loadAlumniMeState>>;
  try {
    state = await loadAlumniMeState(jar);
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return (
        <PageMain width="record">
          <ErrorState title="Database is not configured" body="Set DATABASE_URL and reload." />
        </PageMain>
      );
    }
    throw error;
  }
  if (!state) redirect("/alumni-login?next=/me");

  const { identity, account, records, mergeCandidates } = state;
  const email = account?.email || identity.email || identity.name || "Alumnus";

  try {
    const badgesById =
      records.length === 0
        ? {}
        : await listPublicBadgesManyFromFeed(
            records.map((row) => row.id),
            { verifiedAlumniIds: records.map((row) => row.id) },
          );

    return (
      <PageShell>
        <LockerHeader current="me" viewer={viewer} />
        <PageMain width="record">
          <PageHeader
            title="My alumni record"
            description="Alum Mode: edit your photos and contact record, search the Directory, and post Brothers on For You. A successful claim shows Verified Hoya."
            actions={records.length > 0 ? <VerifiedHoyaBadge /> : undefined}
          />
          {records.length === 0 ? (
            <EmptyState
              title="No claimed records yet"
              body="Register yourself from the roster lookup to attach a player card to this login."
              icon="profile"
              action={
                <Button asChild>
                  <Link href="/register">Register myself</Link>
                </Button>
              }
            />
          ) : (
            <AlumniMePanel
              email={email}
              records={records}
              mergeCandidates={mergeCandidates}
              badgesById={badgesById}
            />
          )}
        </PageMain>
      </PageShell>
    );
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return (
        <PageMain width="record">
          <ErrorState title="Database is not configured" body="Set DATABASE_URL and reload." />
        </PageMain>
      );
    }
    throw error;
  }
}
