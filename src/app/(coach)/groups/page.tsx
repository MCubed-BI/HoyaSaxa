import { AlumniGroupsManager } from "@/components/alumni-groups-manager";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
import { listAlumniGroups } from "@/lib/alumni-groups";
import { isMissingDatabaseConfig } from "@/lib/db";
import { requireRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  await requireRole(["owner", "coach"]);

  try {
    const groups = await listAlumniGroups();
    return (
      <PageShell>
        <SiteHeader current="groups" />
        <PageMain>
          <PageHeader
            eyebrow="Outreach"
            title="Groups"
            description="Save directory picks into named lists, then choose a group when sending a text or email blast."
          />
          <AlumniGroupsManager initialGroups={groups} />
        </PageMain>
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell>
        <SiteHeader current="groups" />
        <PageMain>
          <StatusCard
            title="Groups unavailable"
            body={
              isMissingDatabaseConfig(error)
                ? "DATABASE_URL is not set. Add it to .env.local and reload."
                : error instanceof Error
                  ? error.message
                  : "Could not load groups."
            }
          />
        </PageMain>
      </PageShell>
    );
  }
}
