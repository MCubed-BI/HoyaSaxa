import { NewsflashForm } from "@/components/portal-forms";
import { PortalShell } from "@/components/portal-shell";
import { StatusCard } from "@/components/status-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listNewsflashPosts } from "@/lib/portal-queries";
import { canPostNewsflash } from "@/lib/roles";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function PortalNewsflashPage() {
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
    <PortalShell viewer={viewer} current="newsflash">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Newsflash</p>
        <h2 className="font-heading text-3xl text-white">Board notes</h2>
        <p className="mt-1 text-sm text-white/65">
          Lars / board posts here via <code>hoya_alum_session</code> role=board. Coder 5 can grow this
          into the full news lane.
        </p>
      </div>
      {canPostNewsflash(viewer.role) ? (
        <Card>
          <CardHeader>
            <CardTitle>Publish</CardTitle>
          </CardHeader>
          <CardContent>
            <NewsflashForm next="/portal/newsflash" />
          </CardContent>
        </Card>
      ) : null}
      {errorMessage ? (
        <StatusCard title="Newsflash unavailable" body={errorMessage} />
      ) : posts.length === 0 ? (
        <StatusCard title="No posts yet" body="When the board publishes, events and notes will show here." />
      ) : (
        posts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{post.body}</p>
            </CardContent>
          </Card>
        ))
      )}
    </PortalShell>
  );
}
