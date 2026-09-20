import { HoyaDirectory } from "@/components/hoya-directory";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { ErrorState } from "@/components/ui/error-state";
import { listPublicBadgesManyFromFeed } from "@/lib/badges-attendance";
import { isMissingDatabaseConfig } from "@/lib/db";
import { parseDirectoryPill, parseLockerPage } from "@/lib/locker-paths";
import { searchLockerDirectory } from "@/lib/locker-directory";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Directory",
  description: "Hoya Football directory — athletes, alumni, coaches, and staff.",
};

function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireLockerViewer("/login");
  const params = await searchParams;
  const q = firstParam(params.q);
  const role = parseDirectoryPill(firstParam(params.role));
  const page = parseLockerPage(firstParam(params.page));

  try {
    const result = await searchLockerDirectory({ q, role, page });
    const badgesById = await listPublicBadgesManyFromFeed(result.rows.map((row) => row.id));
    return (
      <PageMain width="record">
        <PageHeader
          eyebrow="Hoya Directory"
          title="The roster"
          description="Search by name, class, or city. Cards on phone, a sticky table on desktop. Emails stay hidden here — select classmates and use Email selected to compose."
        />
        <HoyaDirectory
          q={q}
          role={role}
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          usingSample={result.usingSample}
          badgesById={badgesById}
        />
      </PageMain>
    );
  } catch (error) {
    return (
      <PageMain width="record">
        <PageHeader eyebrow="Hoya Directory" title="The roster" />
        <ErrorState
          title="Directory unavailable"
          body={
            isMissingDatabaseConfig(error)
              ? "DATABASE_URL is not set. Add it to .env.local and reload."
              : error instanceof Error
                ? error.message
                : "The directory could not be loaded."
          }
        />
      </PageMain>
    );
  }
}
