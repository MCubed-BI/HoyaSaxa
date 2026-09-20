import { FeedPostCard } from "@/components/locker-cards";
import { LockerHeader } from "@/components/locker-header";
import { NewsflashForm } from "@/components/newsflash-form";
import { Notice, PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { newsflashToFeedPost } from "@/lib/locker-data";
import { loadLockerHome } from "@/lib/locker-queries";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function BoardFeedPage() {
  const viewer = await requireLockerViewer();
  const data = await loadLockerHome();

  return (
    <PageShell>
      <LockerHeader current="board" viewer={viewer} />
      <PageMain width="narrow" className="pb-24 md:pb-8">
        <PageHeader
          eyebrow="Board"
          title="Board"
          description="Canonical feed section `board` (Newsflash redirects here). Board and admin can publish. Alumni read every post."
        />

        {viewer.canPostNewsflash ? (
          <Card>
            <CardHeader>
              <CardTitle>Publish</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Signed in as {viewer.label} ({viewer.platformRole}).
              </p>
              <NewsflashForm />
            </CardContent>
          </Card>
        ) : (
          <Notice>
            You can read the Board section. Publishing is limited to board and admin.
          </Notice>
        )}

        {data.usingFallback ? <Notice>{data.fallbackReason}</Notice> : null}

        {data.newsflash.length === 0 ? (
          <StatusCard title="No posts yet" body="When the board publishes, alumni will see it here." />
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
