import Link from "next/link";
import { ForYouCard } from "@/components/for-you-card";
import { ForYouComposer } from "@/components/for-you-composer";
import { ForYouFilters } from "@/components/for-you-filters";
import { HoyaAvatar } from "@/components/hoya-avatar";
import { Notice } from "@/components/page-chrome";
import { canPostToFeedSection, type FeedSection } from "@/lib/feed-sections";
import {
  forYouEmptyCopy,
  forYouFilterHref,
  forYouHeading,
  forYouSectionsForFilter,
  type ForYouCardPost,
  type ForYouFilter,
  type ForYouIdentity,
} from "@/lib/for-you";
import type { LockerViewer } from "@/lib/locker-viewer";

function sectionClass(section: FeedSection) {
  if (section === "brothers") return "for-you__brothers";
  if (section === "board") return "for-you__board";
  return "for-you__sgarlata";
}

function Section({
  section,
  posts,
  viewer,
}: {
  section: FeedSection;
  posts: ForYouCardPost[];
  viewer: LockerViewer;
}) {
  return (
    <section id={section} className={sectionClass(section)}>
      <h2 className="for-you__section-label">{forYouHeading(section)}</h2>
      {canPostToFeedSection(viewer.platformRole, section) ? (
        <ForYouComposer section={section} next={forYouFilterHref(section)} />
      ) : null}
      {posts.length === 0 ? (
        <p className="for-you__empty">{forYouEmptyCopy(section)}</p>
      ) : (
        <div className="for-you__cards">
          {posts.map((post) => (
            <ForYouCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

export function ForYouFeed({
  viewer,
  identity,
  posts,
  fallbackReason,
  filter = "all",
}: {
  viewer: LockerViewer;
  identity: ForYouIdentity;
  posts: Record<FeedSection, ForYouCardPost[]>;
  fallbackReason?: string | null;
  filter?: ForYouFilter;
}) {
  const sections = forYouSectionsForFilter(filter);

  return (
    <div className="for-you">
      <aside className="for-you__identity">
        <HoyaAvatar
          person={{
            preferredName: identity.preferredName,
            firstName: identity.firstName,
            lastName: identity.lastName,
            fullName: identity.fullName,
            photoUrl: identity.photoUrl,
          }}
          size="lg"
        />
        <div className="for-you__identity-copy">
          <p className="for-you__identity-name">{identity.name}</p>
          {identity.classYear ? <p className="for-you__identity-class">{identity.classYear}</p> : null}
          <Link href={identity.lockerHref} className="for-you__identity-locker">
            Locker
          </Link>
        </div>
      </aside>

      <div className="for-you__feeds">
        <ForYouFilters active={filter} />
        {fallbackReason ? <Notice>{fallbackReason}</Notice> : null}
        {sections.map((section) => (
          <Section key={section} section={section} posts={posts[section]} viewer={viewer} />
        ))}
      </div>
    </div>
  );
}
