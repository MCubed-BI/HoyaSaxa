import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AlumniMePanel } from "@/components/alumni-me-panel";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { ProductHeader } from "@/components/product-header";
import { VerifiedHoyaBadge } from "@/components/verified-hoya-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { accountIdFromCookies, findSameLastNameCandidates, getAccountById, getClaimedRecords } from "@/lib/alumni-claim";
import { listPublicBadgesManyFromFeed } from "@/lib/badges-attendance";
import { isMissingDatabaseConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const jar = await cookies();
  const accountId = await accountIdFromCookies(jar);
  if (!accountId) redirect("/alumni-login?next=/me");

  try {
    const account = await getAccountById(accountId);
    if (!account) redirect("/alumni-login?next=/me");
    const records = await getClaimedRecords(accountId);
    const lastName = records[0]?.last_name ?? "";
    const mergeCandidates = lastName
      ? await findSameLastNameCandidates(
          lastName,
          accountId,
          records.map((row) => row.id),
        )
      : [];
    const badgesById = await listPublicBadgesManyFromFeed(
      records.map((row) => row.id),
      { verifiedAlumniIds: records.map((row) => row.id) },
    );

    return (
      <PageShell>
        <ProductHeader
          homeHref="/me"
          items={[]}
          roleLabel="Alumni record"
          mobileNav="none"
          signOutAction="/api/alumni/logout"
          showSignOut
          trailing={
            <Button asChild variant="ghost" className="h-8 px-2.5 text-muted-foreground">
              <Link href="/register">Register another</Link>
            </Button>
          }
        />
        <PageMain width="record">
          <PageHeader
            title="My alumni record"
            description="Alumni can edit their own contact record or merge a duplicate roster row. This login does not open the coach directory."
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
              email={account.email}
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
