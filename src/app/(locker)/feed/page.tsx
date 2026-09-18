import Link from "next/link";
import { FeedPostCard } from "@/components/locker-cards";
import { LockerHeader } from "@/components/locker-header";
import { StatusCard } from "@/components/status-card";
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
    <div className="flex min-h-full flex-col">
      <LockerHeader current="feed" viewer={viewer} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Feed</p>
          <h2 className="font-heading text-3xl text-navy">For You</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Official Newsflash plus alumni posts. Teammates and Following are stubs until roster
            links and a follow graph exist.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FEED_TABS.map((item) => (
            <Link
              key={item}
              href={item === "for-you" ? "/feed" : `/feed?tab=${item}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                tab === item
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {feedTabLabel(item)}
            </Link>
          ))}
        </div>

        {data.usingFallback ? (
          <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
            {data.fallbackReason}
          </p>
        ) : null}

        {posts.length === 0 ? (
          <StatusCard title={feedTabLabel(tab)} body={feedTabStub(tab)} />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
