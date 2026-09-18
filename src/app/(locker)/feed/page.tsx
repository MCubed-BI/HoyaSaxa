import Link from "next/link";
import { FeedPostCard } from "@/components/locker-cards";
import { LockerHeader } from "@/components/locker-header";
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
    <>
      <LockerHeader current="feed" viewer={viewer} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">Feed</p>
          <h2 className="font-heading text-4xl text-white">For You</h2>
          <p className="mt-2 text-sm text-white/65">
            MVP mixes official Newsflash with alumni posts. Teammates and Following are stubbed until
            roster links and a follow graph exist.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-navy/50 p-2">
          {FEED_TABS.map((item) => (
            <Link
              key={item}
              href={item === "for-you" ? "/feed" : `/feed?tab=${item}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                tab === item ? "bg-gold text-navy" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {feedTabLabel(item)}
            </Link>
          ))}
        </div>

        {data.usingFallback ? (
          <p className="rounded-lg border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
            {data.fallbackReason}
          </p>
        ) : null}

        {posts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-card/80 px-5 py-10 text-center">
            <p className="font-heading text-2xl text-white">{feedTabLabel(tab)}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">{feedTabStub(tab)}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
