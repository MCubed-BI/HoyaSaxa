import Link from "next/link";
import { FeedPostCard } from "@/components/locker-cards";
import { LockerHeader } from "@/components/locker-header";
import { Notice, PageHeader, PageMain, PageShell, pillClass } from "@/components/page-chrome";
import { EmptyState } from "@/components/query-state";
import { LoadedStamp } from "@/components/timestamp";
import {
  FEED_TABS,
  feedTabLabel,
  feedTabStub,
  filterFeedPosts,
  isFeedTab,
  type FeedTab,
} from "@/lib/locker-data";
import { loadLockerHome } from "@/lib/locker-queries";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

function tabFromParams(value: string | string[] | undefined): FeedTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return isFeedTab(raw) ? raw : "for-you";
}

export default async function ForYouFeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireLockerViewer();
  const params = await searchParams;
  const tab = tabFromParams(params.tab);
  const data = await loadLockerHome();
  const posts = filterFeedPosts(data.feed, tab);

  return (
    <PageShell>
      <LockerHeader current="feed" viewer={viewer} />
      <PageMain width="narrow" className="pb-24 md:pb-8">
        <PageHeader
          eyebrow="Feed"
          title="For You"
          description="Official Newsflash plus alumni posts. Teammates and Following are stubs until roster links and a follow graph exist."
        />

        <div className="flex flex-wrap gap-2">
          {FEED_TABS.map((item) => (
            <Link
              key={item}
              href={item === "for-you" ? "/feed" : `/feed?tab=${item}`}
              className={pillClass(tab === item)}
            >
              {feedTabLabel(item)}
            </Link>
          ))}
        </div>

        <LoadedStamp value={new Date().toISOString()} />
        {data.usingFallback ? <Notice>{data.fallbackReason}</Notice> : null}

        {posts.length === 0 ? (
          <EmptyState title={feedTabLabel(tab)} body={feedTabStub(tab)} icon="feed" />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </PageMain>
    </PageShell>
  );
}
