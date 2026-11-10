import { MessagesInbox } from "@/components/messages-inbox";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listViewerMessageChannels, parseMessageFilter } from "@/lib/messages";
import { dmParticipantId } from "@/lib/messages-dm";
import { requireMessageViewer } from "@/lib/messages-viewer";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; compose?: string }>;
}) {
  const viewer = await requireMessageViewer();
  const params = await searchParams;
  const filter = parseMessageFilter(params.filter);
  const compose = params.compose === "1";
  const viewerAlumniId = dmParticipantId(viewer);
  const canCompose = Boolean(viewerAlumniId);
  const searchView = viewer.kind === "staff" || viewer.isAdmin ? "admin" : "alum";

  let channels: Awaited<ReturnType<typeof listViewerMessageChannels>> = [];
  let errorMessage: string | null = null;

  try {
    channels = await listViewerMessageChannels(viewer);
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load messages.";
  }

  return (
    <PageMain width="narrow" className="pb-24 md:pb-8">
      <PageHeader
        eyebrow={viewer.kind === "alum" ? "Alumni" : "Staff"}
        title="Messages"
        description="Message from Sgarlata and direct messages with Hoyas."
      />
      {errorMessage ? (
        <StatusCard title="Messages unavailable" body={errorMessage} />
      ) : (
        <MessagesInbox
          channels={channels}
          filter={filter}
          viewerAlumniId={viewerAlumniId}
          canCompose={canCompose}
          compose={compose}
          searchView={searchView}
        />
      )}
    </PageMain>
  );
}
