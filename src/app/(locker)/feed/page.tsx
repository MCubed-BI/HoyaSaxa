import Link from "next/link";
import { BrothersComposer } from "@/components/brothers-composer";
import { FeedPostCard } from "@/components/locker-cards";
import { LockerHeader } from "@/components/locker-header";
import { Notice, PageHeader, PageMain, PageShell, pillClass } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { FEED_SECTIONS, feedSectionLabel, parseFeedSectionParam } from "@/lib/feed-sections";
import {
  FEED_TABS,
  feedTabLabel,
  feedTabStub,
  filterFeedPosts,
  filterFeedPostsBySection,
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
  const section = parseFeedSectionParam(params.section);
  const data = await loadLockerHome();
  const posts = section ? filterFeedPostsBySection(data.feed, section) : filterFeedPosts(data.feed, tab);

  return (
    <PageShell>
      <LockerHeader current="feed" viewer={viewer} />
      <PageMain width="narrow" className="pb-24 md:pb-8">
        <PageHeader
          eyebrow="Feed"
          title="For You"
          description="Canonical sections: Brothers, Board, From Sgarlata. Newsflash is an alias of Board. Teammates and Following stay stubs."
        />

        <div className="flex flex-wrap gap-2">
          {FEED_SECTIONS.map((item) => (
            <Link
              key={item}
              href={item === "sgarlata" ? "/messages/sgarlata" : `/feed?section=${item}`}
              className={pillClass(section === item)}
            >
              {feedSectionLabel(item)}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {FEED_TABS.map((item) => (
            <Link
              key={item}
              href={item === "for-you" ? "/feed" : `/feed?tab=${item}`}
              className={pillClass(!section && tab === item)}
            >
              {feedTabLabel(item)}
            </Link>
          ))}
        </div>

        {data.usingFallback ? <Notice>{data.fallbackReason}</Notice> : null}

        {viewer.canPostBrothers ? <BrothersComposer /> : null}

        {posts.length === 0 ? (
          <StatusCard
            title={section ? feedSectionLabel(section) : feedTabLabel(tab)}
            body={section ? "Nothing in this section yet." : feedTabStub(tab)}
          />
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
