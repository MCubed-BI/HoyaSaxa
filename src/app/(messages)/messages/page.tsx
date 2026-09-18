import { MessagesInbox } from "@/components/messages-inbox";
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
    channels = await listMessageChannels(viewer.viewerKey);
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load messages.";
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {viewer.kind === "alum" ? "Alumni · read only" : "Staff · can post"}
        </p>
        <h2 className="font-heading text-3xl text-navy">Messages</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter All, Unread, or Groups. Message from Sgarlata is the pinned official channel.
        </p>
      </div>
      {errorMessage ? (
        <StatusCard title="Messages unavailable" body={errorMessage} />
      ) : (
        <MessagesInbox channels={channels} filter={filter} />
      )}
    </main>
  );
}
