import Link from "next/link";
import { notFound } from "next/navigation";
import { MessagesCompose } from "@/components/messages-compose";
import { StatusCard } from "@/components/status-card";
import { Badge } from "@/components/ui/badge";
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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <StatusCard title="Channel unavailable" body={errorMessage} />
      </main>
    );
  }

  if (!channel) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <div>
        <Link href="/messages" className="text-sm text-navy hover:underline">
          ← Messages
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-3xl text-navy">{channel.name}</h2>
          {channel.kind === "official" ? (
            <Badge variant="secondary">Official</Badge>
          ) : (
            <Badge variant="outline">Group</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {channel.description ||
            (canPost ? "Staff can post. Alumni read this channel." : "Read only for alumni.")}
        </p>
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
        <StatusCard title="No posts yet" body="When staff publish, the note will show here." />
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
                  {post.author_label || "Staff"} · {new Date(post.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
