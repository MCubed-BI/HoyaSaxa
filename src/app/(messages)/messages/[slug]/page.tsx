import Link from "next/link";
import { notFound } from "next/navigation";
import { MessagesCompose } from "@/components/messages-compose";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "@/components/timestamp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { inboxChannelTitle, isDirectChannel, getMessageChannel, listMessagePosts, markChannelRead } from "@/lib/messages";
import { requireMessageViewer } from "@/lib/messages-viewer";
import { canPostToMessageChannel } from "@/lib/messages-dm";
import { athleteHref } from "@/lib/locker-paths";

export const dynamic = "force-dynamic";

export default async function MessageChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await requireMessageViewer(`/messages/${slug}`);

  let errorMessage: string | null = null;
  let channel: Awaited<ReturnType<typeof getMessageChannel>> = null;
  let posts: Awaited<ReturnType<typeof listMessagePosts>> = [];

  try {
    channel = await getMessageChannel(slug, viewer.viewerKey, viewer.alumniId);
    if (!channel) notFound();
    posts = await listMessagePosts(channel.id);
    await markChannelRead(channel.id, viewer.viewerKey);
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
      <PageMain width="narrow" className="pb-24 md:pb-8">
        <StatusCard title="Channel unavailable" body={errorMessage} />
      </PageMain>
    );
  }

  if (!channel) notFound();

  const canPost = canPostToMessageChannel(viewer, channel);
  const direct = isDirectChannel(channel);
  const title = inboxChannelTitle(channel);

  return (
    <PageMain width="narrow" className="pb-24 md:pb-8">
      <div className="space-y-3">
        <Link href="/messages" className="text-sm font-medium text-navy hover:underline">
          ← Messages
        </Link>
        <PageHeader
          title={title}
          description={
            direct
              ? `Direct message with ${title}. Both of you will see this thread in Messages.`
              : channel.description ||
                (canPost
                  ? "Admin can post From Sgarlata. Board and alumni can read this channel."
                  : "Read only. Board and Alum cannot compose From Sgarlata.")
          }
          actions={
            channel.kind === "official" ? (
              <Badge variant="secondary">Official</Badge>
            ) : direct ? (
              <Badge variant="outline">Direct</Badge>
            ) : (
              <Badge variant="outline">Group</Badge>
            )
          }
        />
        {direct && channel.peer_alumni_id ? (
          <Link href={athleteHref(channel.peer_alumni_id)} className="text-sm font-medium text-navy hover:underline">
            View profile
          </Link>
        ) : null}
      </div>

      {canPost ? (
        <Card>
          <CardHeader>
            <CardTitle>{direct ? "Send message" : "New message"}</CardTitle>
          </CardHeader>
          <CardContent>
            <MessagesCompose
              slug={channel.slug}
              variant={direct ? "dm" : "official"}
              recipientName={direct ? title : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Board and alumni can read this channel. Only Admin can compose From Sgarlata.
        </p>
      )}

      {posts.length === 0 ? (
        <StatusCard
          title={direct ? "No messages yet" : "No posts yet"}
          body={direct ? "Send the first note. It will appear here for both of you." : "When staff publish, the note will show here."}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <CardTitle>{post.title || "Message"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="whitespace-pre-wrap text-sm">{post.body}</p>
                <p className="text-xs text-muted-foreground">
                  {post.author_label || "Staff"} · <Timestamp value={post.created_at} />
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageMain>
  );
}
