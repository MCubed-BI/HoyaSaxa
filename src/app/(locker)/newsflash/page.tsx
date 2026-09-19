import { FeedPostCard } from "@/components/locker-cards";
import { LockerHeader } from "@/components/locker-header";
import { NewsflashForm } from "@/components/newsflash-form";
import { Notice, PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { EmptyState } from "@/components/query-state";
import { LoadedStamp } from "@/components/timestamp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { newsflashToFeedPost } from "@/lib/locker-data";
import { loadLockerHome } from "@/lib/locker-queries";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function NewsflashPage() {
  const viewer = await requireLockerViewer();
  const data = await loadLockerHome();

  return (
    <PageShell>
      <LockerHeader current="newsflash" viewer={viewer} />
      <PageMain width="narrow" className="pb-24 md:pb-8">
        <PageHeader
          eyebrow="Board"
          title="Newsflash"
          description="Board can publish. Alumni read every post. Dated posts also fill the Home upcoming-event card."
        />

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
          <Notice>
            You can read Newsflash. Publishing is limited to board (sign in as <code>Lars</code> on
            /home/login).
          </Notice>
        )}

        <LoadedStamp />
        {data.usingFallback ? <Notice>{data.fallbackReason}</Notice> : null}

        {data.newsflash.length === 0 ? (
          <EmptyState
            title="No posts yet"
            body="When the board publishes, alumni will see it here."
            icon="newsflash"
          />
        ) : (
          <div className="space-y-3">
            {data.newsflash.map((post) => (
              <FeedPostCard key={post.id} post={newsflashToFeedPost(post)} />
            ))}
          </div>
        )}
      </PageMain>
    </PageShell>
  );
}
