import { FeedPostCard } from "@/components/locker-cards";
import { LockerHeader } from "@/components/locker-header";
import { NewsflashForm } from "@/components/newsflash-form";
import { StatusCard } from "@/components/status-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { newsflashToFeedPost } from "@/lib/locker-data";
import { loadLockerHome } from "@/lib/locker-queries";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function NewsflashPage() {
  const viewer = await requireLockerViewer();
  const data = await loadLockerHome();

  return (
    <div className="flex min-h-full flex-col">
      <LockerHeader current="newsflash" viewer={viewer} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Board
          </p>
          <h2 className="font-heading text-3xl text-navy">Newsflash</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Board role on <code>hoya_alum_session</code> can publish. Alumni read every post. Dated
            posts also fill the Home upcoming-event card until the Events lane owns{" "}
            <code>events</code>.
          </p>
        </div>

        {viewer.canPostNewsflash ? (
          <Card>
            <CardHeader>
              <CardTitle>Publish</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Signed in as {viewer.label} (board).</p>
              <NewsflashForm />
            </CardContent>
          </Card>
        ) : (
          <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
            You can read Newsflash. Publishing is limited to board (sign in as <code>Lars</code> on
            /home/login).
          </p>
        )}

        {data.usingFallback ? (
          <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
            {data.fallbackReason}
          </p>
        ) : null}

        {data.newsflash.length === 0 ? (
          <StatusCard
            title="No posts yet"
            body="When the board publishes, alumni will see it here."
          />
        ) : (
          <div className="space-y-3">
            {data.newsflash.map((post) => (
              <FeedPostCard key={post.id} post={newsflashToFeedPost(post)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
