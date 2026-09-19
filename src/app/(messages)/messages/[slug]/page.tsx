import Link from "next/link";
import { notFound } from "next/navigation";
import { MessagesCompose } from "@/components/messages-compose";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { EmptyState, ErrorState } from "@/components/query-state";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "@/components/timestamp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getMessageChannel, listMessagePosts, markChannelRead } from "@/lib/messages";
import { canPostSgarlata } from "@/lib/messages-auth";
import { requireMessageViewer } from "@/lib/messages-viewer";

export const dynamic = "force-dynamic";

export default async function MessageChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await requireMessageViewer(`/messages/${slug}`);
  const canPost = canPostSgarlata(viewer);

  let errorMessage: string | null = null;
  let channel: Awaited<ReturnType<typeof getMessageChannel>> = null;
  let posts: Awaited<ReturnType<typeof listMessagePosts>> = [];

  try {
    channel = await getMessageChannel(slug, viewer.viewerKey);
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
        <ErrorState title="Channel unavailable" body={errorMessage} />
      </PageMain>
    );
  }

  if (!channel) notFound();

  return (
    <PageMain width="narrow" className="pb-24 md:pb-8">
      <div className="space-y-3">
        <Link href="/messages" className="text-sm font-medium text-navy hover:underline">
          ← Messages
        </Link>
        <PageHeader
          title={channel.name}
          description={
            channel.description ||
            (canPost ? "Staff can post. Alumni read this channel." : "Read only for alumni.")
          }
          actions={
            channel.kind === "official" ? (
              <Badge variant="secondary">Official</Badge>
            ) : (
              <Badge variant="outline">Group</Badge>
            )
          }
        />
      </div>

      {canPost ? (
        <Card>
          <CardHeader>
            <CardTitle>New message</CardTitle>
          </CardHeader>
          <CardContent>
            <MessagesCompose slug={channel.slug} />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Alumni can read this channel. Staff post via the coach login.</p>
      )}

      {posts.length === 0 ? (
        <EmptyState title="No posts yet" body="When staff publish, the note will show here." icon="messages" />
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
