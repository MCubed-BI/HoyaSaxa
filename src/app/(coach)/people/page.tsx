import { AdminPeoplePanel } from "@/components/admin-people-panel";
import { SiteHeader } from "@/components/site-header";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { countUnverifiedPeople, listPeopleForAdmin } from "@/lib/people-admin";
import { ensurePersonColumns } from "@/lib/people-schema";
import { ensurePortalTables } from "@/lib/portal-schema";
import { requirePlatformRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function AdminPeoplePage() {
  await requirePlatformRole(["admin"]);
  let people: Awaited<ReturnType<typeof listPeopleForAdmin>> = [];
  let pending = 0;
  let errorMessage: string | null = null;

  try {
    await ensurePersonColumns();
    people = await listPeopleForAdmin({ limit: 150 });
    pending = await countUnverifiedPeople();
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load People.";
  }

  return (
    <PageShell>
      <SiteHeader current="people" />
      <PageMain>
        <PageHeader
          eyebrow="Admin"
          title="People"
          description="Add and verify Players (Alum), Georgetown Supporters, or Development admins. Alum requires a NetID and password; Support requires a username and password; Development uses Admin sign-in credentials."
        />
        {errorMessage ? (
          <StatusCard title="People unavailable" body={errorMessage} />
        ) : (
          <AdminPeoplePanel initialPeople={people} initialPending={pending} />
        )}
      </PageMain>
    </PageShell>
  );
}
