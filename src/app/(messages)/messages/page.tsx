import { MessagesInbox } from "@/components/messages-inbox";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listMessageChannels, parseMessageFilter } from "@/lib/messages";
import { requireMessageViewer } from "@/lib/messages-viewer";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const viewer = await requireMessageViewer();
  const params = await searchParams;
  const filter = parseMessageFilter(params.filter);

  let channels: Awaited<ReturnType<typeof listMessageChannels>> = [];
  let errorMessage: string | null = null;

  try {
    channels = await listMessageChannels(viewer.viewerKey, viewer.alumniId);
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
        eyebrow={viewer.kind === "alum" ? "Alumni · Messages" : "Staff · can post official notes"}
        title="Messages"
        description="Direct messages from Hoya profiles land here, next to Message from Sgarlata and group channels."
      />
      {errorMessage ? (
        <StatusCard title="Messages unavailable" body={errorMessage} />
      ) : (
        <MessagesInbox channels={channels} filter={filter} />
      )}
    </PageMain>
  );
}
