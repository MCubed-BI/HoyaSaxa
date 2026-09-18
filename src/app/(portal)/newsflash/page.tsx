import { NewsflashForm } from "@/components/portal-forms";
import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listNewsflashPosts } from "@/lib/portal-queries";
import { canPostNewsflash } from "@/lib/roles";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function NewsflashPage() {
  const viewer = await requireViewer();
  let posts: Awaited<ReturnType<typeof listNewsflashPosts>> = [];
  let errorMessage: string | null = null;

  try {
    posts = await listNewsflashPosts();
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load newsflash.";
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="newsflash" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Board</p>
          <h2 className="font-heading text-3xl text-navy">Newsflash</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Board (Lars) can post news and events. Alumni read. Stored in <code>newsflash_posts</code>.
          </p>
        </div>

        {canPostNewsflash(viewer.role) ? (
          <Card>
            <CardHeader>
              <CardTitle>Publish</CardTitle>
            </CardHeader>
            <CardContent>
              <NewsflashForm />
            </CardContent>
          </Card>
        ) : null}

        {errorMessage ? (
          <StatusCard title="Newsflash unavailable" body={errorMessage} />
        ) : posts.length === 0 ? (
          <StatusCard title="No posts yet" body="When the board publishes, events and notes will show here." />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <CardTitle>{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="whitespace-pre-wrap text-sm">{post.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {post.author_label || "Board"}
                    {post.event_at ? ` · event ${new Date(post.event_at).toLocaleDateString()}` : ""}
                    {` · ${new Date(post.created_at).toLocaleString()}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
