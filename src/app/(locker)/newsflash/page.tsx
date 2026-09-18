import { FeedPostCard } from "@/components/locker-cards";
import { LockerHeader } from "@/components/locker-header";
import { NewsflashForm } from "@/components/newsflash-form";
import { newsflashToFeedPost } from "@/lib/locker-data";
import { loadLockerHome } from "@/lib/locker-queries";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function NewsflashPage() {
  const viewer = await requireLockerViewer();
  const data = await loadLockerHome();

  return (
    <>
      <LockerHeader current="newsflash" viewer={viewer} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">Lars · Board</p>
          <h2 className="font-heading text-4xl text-white">Newsflash</h2>
          <p className="mt-2 text-sm text-white/65">
            Board role on <code className="text-gold">hoya_alum_session</code> can publish. Alumni
            read every post. Dated posts also fill the Home upcoming-event card until the Events lane
            owns <code className="text-gold">events</code>.
          </p>
        </div>

        {viewer.canPostNewsflash ? (
          <section className="rounded-xl border border-gold/30 bg-card/90 px-5 py-5">
            <h3 className="font-heading text-2xl text-white">Publish</h3>
            <p className="mb-4 mt-1 text-sm text-white/60">Signed in as {viewer.label} (board).</p>
            <NewsflashForm />
          </section>
        ) : (
          <p className="rounded-lg border border-white/10 bg-navy/40 px-4 py-3 text-sm text-white/65">
            You can read Newsflash. Publishing is limited to board (sign in as{" "}
            <code className="text-gold">Lars</code> on /home/login).
          </p>
        )}

        {data.usingFallback ? (
          <p className="rounded-lg border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
            {data.fallbackReason} Publish needs a connected Neon database.
          </p>
        ) : null}

        {data.newsflash.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-card/80 px-5 py-10 text-center">
            <p className="font-heading text-2xl text-white">No posts yet</p>
            <p className="mt-2 text-sm text-white/60">When the board publishes, alumni will see it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.newsflash.map((post) => (
              <FeedPostCard key={post.id} post={newsflashToFeedPost(post)} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
