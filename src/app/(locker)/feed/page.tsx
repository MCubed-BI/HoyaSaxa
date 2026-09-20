import { ForYouFeed } from "@/components/for-you-feed";
import { LockerHeader } from "@/components/locker-header";
import { PageMain, PageShell } from "@/components/page-chrome";
import { loadForYouIdentity, loadForYouPosts } from "@/lib/for-you-data";
import { parseForYouFilter } from "@/lib/for-you";
import { requireLockerViewer } from "@/lib/locker-viewer";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "For You",
  description: `Your Brothers, Board, and From Your Headcoach — ${PRODUCT_DISPLAY_NAME}.`,
};

export default async function ForYouFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const viewer = await requireLockerViewer();
  const params = await searchParams;
  const filter = parseForYouFilter(params.section);
  const [identity, data] = await Promise.all([loadForYouIdentity(viewer), loadForYouPosts()]);

  return (
    <PageShell>
      <LockerHeader current="feed" viewer={viewer} />
      <PageMain width="default" className="pb-24 md:pb-8">
        <ForYouFeed
          viewer={viewer}
          identity={identity}
          posts={data.posts}
          fallbackReason={data.fallbackReason}
          filter={filter}
        />
      </PageMain>
    </PageShell>
  );
}
