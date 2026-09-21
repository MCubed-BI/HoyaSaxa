import type { FeedSection } from "@/lib/feed-sections";

export type NewsflashPost = {
  id: string;
  title: string;
  body: string;
  event_at: string | null;
  author_label: string | null;
  created_at: string;
};

export type FeedPost = {
  id: string;
  author_label: string;
  author_role: "official" | "alum";
  audience: string;
  title: string | null;
  body: string;
  created_at: string;
  source: "newsflash" | "feed";
  section?: FeedSection;
  media_url?: string | null;
};

export type UpcomingEvent = {
  title: string;
  body: string;
  startsAt: string;
  location: string | null;
  source: "events" | "newsflash" | "demo";
  href: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  body: string;
  when: string;
  kind: "newsflash" | "feed" | "directory";
};

export const FEED_TABS = ["for-you", "teammates", "alumni", "following"] as const;
export type FeedTab = (typeof FEED_TABS)[number];

export function isFeedTab(value: string | null | undefined): value is FeedTab {
  return Boolean(value && (FEED_TABS as readonly string[]).includes(value));
}

export const DEMO_UPCOMING_EVENT: UpcomingEvent = {
  title: "Homecoming weekend at Cooper Field",
  body: "Board gathering after kickoff. RSVP and details are on the event page.",
  startsAt: "2026-10-17T16:00:00.000Z",
  location: "Cooper Field · Georgetown",
  source: "demo",
  href: "/events",
};

export const DEMO_NEWSFLASH: NewsflashPost[] = [
  {
    id: "demo-newsflash-homecoming",
    title: "Homecoming weekend at Cooper Field",
    body: "Lars: board hosts a Legacy Locker gathering after the homecoming kick. Details land here first — bring a classmate.",
    event_at: "2026-10-17T16:00:00.000Z",
    author_label: "Lars",
    created_at: "2026-09-18T12:00:00.000Z",
  },
  {
    id: "demo-newsflash-live",
    title: "Board notes are live",
    body: "Board notes, game-week updates, and locker announcements now publish here. Alumni can read every post; only board can write.",
    event_at: null,
    author_label: "Lars",
    created_at: "2026-09-18T11:00:00.000Z",
  },
];

export const DEMO_FEED: FeedPost[] = [
  {
    id: "demo-feed-official",
    author_label: "Georgetown Football",
    author_role: "official",
    audience: "for-you",
    title: "Fall camp notes",
    body: "Official: fall camp wraps this week. Watch From Your Board for the board’s homecoming plan.",
    created_at: "2026-09-17T18:00:00.000Z",
    source: "feed",
    section: "board",
  },
  {
    id: "demo-feed-alum",
    author_label: "Pat Hoya ’15",
    author_role: "alum",
    audience: "alumni",
    title: "Who’s in D.C. Friday?",
    body: "In town for a client dinner. Anyone around Dupont want to grab a Hoya pint?",
    created_at: "2026-09-16T21:00:00.000Z",
    source: "feed",
    section: "brothers",
  },
];

export function contentKey(title: string | null | undefined, body: string) {
  return `${(title ?? "").trim().toLowerCase()}\n${body.trim().toLowerCase()}`;
}

export function dedupeFeedPosts(posts: FeedPost[]) {
  const seen = new Set<string>();
  const out: FeedPost[] = [];
  for (const post of posts) {
    const keys = [post.id, contentKey(post.title, post.body)];
    if (keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    out.push(post);
  }
  return out;
}

export function dedupeActivityItems(items: ActivityItem[]) {
  const seen = new Set<string>();
  const out: ActivityItem[] = [];
  for (const item of items) {
    const keys = [item.id, contentKey(item.title, item.body)];
    if (keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    out.push(item);
  }
  return out;
}

export function newsflashToFeedPost(post: NewsflashPost): FeedPost {
  return {
    id: `newsflash-${post.id}`,
    author_label: post.author_label || "Board",
    author_role: "official",
    audience: "for-you",
    title: post.title,
    body: post.body,
    created_at: post.created_at,
    source: "newsflash",
    section: "board",
  };
}

export function filterFeedPosts(posts: FeedPost[], tab: FeedTab) {
  if (tab === "teammates" || tab === "following") return [];
  if (tab === "alumni") return posts.filter((post) => post.author_role === "alum");
  return posts;
}

export function filterFeedPostsBySection(posts: FeedPost[], section: FeedSection) {
  return posts.filter((post) => (post.section ?? (post.source === "newsflash" ? "board" : "brothers")) === section);
}

export function feedTabLabel(tab: FeedTab) {
  if (tab === "for-you") return "For You";
  if (tab === "teammates") return "Teammates";
  if (tab === "alumni") return "Alumni";
  return "Following";
}

export function feedTabStub(tab: FeedTab) {
  if (tab === "teammates") {
    return "Teammate posts will appear when roster / class-year links land. Official and alumni posts are on For You and Alumni.";
  }
  if (tab === "following") {
    return "Following is not wired yet. This tab is a stub until a follow graph exists.";
  }
  return "Nothing in this tab yet.";
}
