import Link from "next/link";
import { notFound } from "next/navigation";
import { MessagesCompose } from "@/components/messages-compose";
import { MessagesThread } from "@/components/messages-thread";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { Badge } from "@/components/ui/badge";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getViewerMessageChannel, listMessagePostsPage, markChannelReadForViewer } from "@/lib/messages";
import {
  canPostToMessageChannel,
  dmAuthorLabel,
  dmDisplayName,
  dmParticipantId,
  isDmChannel,
} from "@/lib/messages-dm";
import { requireMessageViewer } from "@/lib/messages-viewer";

export const dynamic = "force-dynamic";

export default async function MessageChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await requireMessageViewer(`/messages/${slug}`);
  let canPost = false;

  let errorMessage: string | null = null;
  let channel: Awaited<ReturnType<typeof getViewerMessageChannel>> = null;
  let posts: Awaited<ReturnType<typeof listMessagePostsPage>>["posts"] = [];
  let hasMoreBefore = false;

  try {
    channel = await getViewerMessageChannel(slug, viewer);
    if (!channel) notFound();
    canPost = canPostToMessageChannel(channel, viewer);
    const page = await listMessagePostsPage(channel.id);
    posts = page.posts;
    hasMoreBefore = page.hasMoreBefore;
    await markChannelReadForViewer(channel.id, viewer);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load this channel.";
  }

  if (errorMessage) {
    return (
      <PageMain width="narrow" className="flex min-h-0 flex-1 flex-col pb-24 md:pb-8">
        <StatusCard title="Channel unavailable" body={errorMessage} />
      </PageMain>
    );
  }

  if (!channel) notFound();

  const dm = isDmChannel(channel);

  return (
    <PageMain width="narrow" className="flex min-h-[calc(100dvh-8rem)] flex-1 flex-col gap-3 pb-24 md:min-h-[calc(100dvh-7rem)] md:pb-8">
      <div className="shrink-0 space-y-2">
        <Link href="/messages" className="text-sm font-medium text-navy hover:underline">
          ← Messages
        </Link>
        <PageHeader
          title={dm ? dmDisplayName(channel, dmParticipantId(viewer)) : channel.name}
          description={
            dm
              ? "Private direct message. Only the two of you can read or send."
              : channel.description ||
                (canPost
                  ? "Admin can post From Sgarlata. Board and alumni can read this channel."
                  : "Read only. Board and Alum cannot compose From Sgarlata.")
          }
          actions={
            channel.kind === "official" ? (
              <Badge variant="secondary">Official</Badge>
            ) : dm ? (
              <Badge variant="outline">Direct</Badge>
            ) : (
              <Badge variant="outline">Group</Badge>
            )
          }
        />
      </div>

      <noscript>
        {canPost ? <MessagesCompose slug={channel.slug} mode={dm ? "dm" : "official"} /> : null}
      </noscript>
      <MessagesThread
        slug={channel.slug}
        mode={dm ? "dm" : "official"}
        canPost={canPost}
        viewerLabel={dm ? dmAuthorLabel(viewer) : viewer.label}
        initialPosts={posts}
        hasMoreBefore={hasMoreBefore}
      />
    </PageMain>
  );
}
