import { randomUUID } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { getDatabaseUrl, getSql } from "@/lib/db";
import {
  DEMO_FEED,
  DEMO_NEWSFLASH,
  DEMO_UPCOMING_EVENT,
  contentKey,
  dedupeActivityItems,
  dedupeFeedPosts,
  newsflashToFeedPost,
  type ActivityItem,
  type FeedPost,
  type NewsflashPost,
  type UpcomingEvent,
} from "@/lib/locker-data";
import { ensureLockerTables } from "@/lib/locker-schema";

type FallbackStore = { newsflash: NewsflashPost[]; feed: FeedPost[] };

const fallbackPath = join(tmpdir(), "hoya-locker-fallback.json");

function readFallback(): FallbackStore {
  try {
    if (existsSync(fallbackPath)) {
      const parsed = JSON.parse(readFileSync(fallbackPath, "utf8")) as FallbackStore;
      if (Array.isArray(parsed.newsflash) && Array.isArray(parsed.feed)) {
        return parsed;
      }
    }
  } catch {
    // Recreate demo content if the temp file is unreadable.
  }
  return {
    newsflash: DEMO_NEWSFLASH.map((post) => ({ ...post })),
    feed: DEMO_FEED.map((post) => ({ ...post })),
  };
}

function writeFallback(store: FallbackStore) {
  writeFileSync(fallbackPath, JSON.stringify(store));
}

export type LockerHomeData = {
  usingFallback: boolean;
  fallbackReason: string | null;
  newsflash: NewsflashPost[];
  feed: FeedPost[];
  upcomingEvent: UpcomingEvent;
  activity: ActivityItem[];
};

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export async function listNewsflashPosts(): Promise<NewsflashPost[]> {
  if (!getDatabaseUrl()) {
    return readFallback().newsflash;
  }
  await ensureLockerTables();
  return query<NewsflashPost[]>(
    `
    SELECT id::text, title, body, event_at::text, author_label, created_at::text
    FROM newsflash_posts
    ORDER BY created_at DESC
    LIMIT 50
    `,
  );
}

export async function createNewsflashPost(input: {
  title: string;
  body: string;
  eventAt?: string | null;
  authorLabel: string;
}) {
  if (!getDatabaseUrl()) {
    const store = readFallback();
    const post: NewsflashPost = {
      id: randomUUID(),
      title: input.title.trim(),
      body: input.body.trim(),
      event_at: input.eventAt ?? null,
      author_label: input.authorLabel,
      created_at: new Date().toISOString(),
    };
    store.newsflash.unshift(post);
    writeFallback(store);
    return post;
  }
  await ensureLockerTables();
  const rows = await query<NewsflashPost[]>(
    `
    INSERT INTO newsflash_posts (title, body, event_at, author_label)
    VALUES ($1, $2, $3, $4)
    RETURNING id::text, title, body, event_at::text, author_label, created_at::text
    `,
    [input.title.trim(), input.body.trim(), input.eventAt ?? null, input.authorLabel],
  );
  return rows[0];
}

export async function listLockerFeedPosts(): Promise<FeedPost[]> {
  if (!getDatabaseUrl()) {
    return readFallback().feed;
  }
  await ensureLockerTables();
  const rows = await query<Array<Omit<FeedPost, "source">>>(
    `
    SELECT id::text, author_label, author_role, audience, title, body, created_at::text
    FROM locker_feed_posts
    ORDER BY created_at DESC
    LIMIT 50
    `,
  );
  return rows.map((row) => ({
    ...row,
    author_role: row.author_role === "official" ? "official" : "alum",
    source: "feed" as const,
  }));
}

async function loadEventsLaneEvent(): Promise<UpcomingEvent | null> {
  try {
    const cols = await query<Array<{ column_name: string }>>(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events'
      `,
    );
    if (cols.length === 0) return null;
    const names = new Set(cols.map((col) => col.column_name));
    const titleCol = ["title", "name", "headline"].find((name) => names.has(name));
    const startCol = ["starts_at", "start_at", "event_at", "starts_on", "start_time"].find((name) =>
      names.has(name),
    );
    if (!titleCol || !startCol) return null;
    const bodyCol = ["body", "description", "summary"].find((name) => names.has(name));
    const locationCol = ["location", "venue", "place"].find((name) => names.has(name));
    const rows = await query<Array<Record<string, string | null>>>(
      `
      SELECT
        ${titleCol}::text AS title,
        ${startCol}::text AS starts_at
        ${bodyCol ? `, ${bodyCol}::text AS body` : ""}
        ${locationCol ? `, ${locationCol}::text AS location` : ""}
      FROM events
      WHERE ${startCol} IS NOT NULL AND ${startCol} >= now()
      ORDER BY ${startCol} ASC
      LIMIT 1
      `,
    );
    const row = rows[0];
    if (!row?.title || !row.starts_at) return null;
    return {
      title: row.title,
      body: row.body || "From the Events lane.",
      startsAt: row.starts_at,
      location: row.location ?? null,
      source: "events",
      href: "/portal/events",
    };
  } catch {
    return null;
  }
}

function upcomingFromNewsflash(posts: NewsflashPost[]): UpcomingEvent | null {
  const dated = posts
    .filter((post) => post.event_at && Date.parse(post.event_at) >= Date.now())
    .sort((a, b) => Date.parse(a.event_at!) - Date.parse(b.event_at!));
  const next = dated[0];
  if (!next?.event_at) return null;
  return {
    title: next.title,
    body: next.body,
    startsAt: next.event_at,
    location: null,
    source: "newsflash",
    href: "/newsflash",
  };
}

async function listDirectoryActivity(): Promise<ActivityItem[]> {
  try {
    const rows = await query<
      Array<{
        id: string;
        first_name: string | null;
        last_name: string;
        preferred_name: string | null;
        position: string | null;
        class_year: string | null;
        updated_at: string;
      }>
    >(
      `
      SELECT id::text, first_name, last_name, preferred_name, position, class_year, updated_at::text
      FROM alumni
      ORDER BY updated_at DESC
      LIMIT 5
      `,
    );
    return rows.map((row) => {
      const name = row.preferred_name || [row.first_name, row.last_name].filter(Boolean).join(" ");
      const detail = [row.position, row.class_year].filter(Boolean).join(" · ");
      return {
        id: `alumni-${row.id}`,
        title: name || "Alumni update",
        body: detail ? `Directory activity · ${detail}` : "Directory record updated.",
        when: row.updated_at,
        kind: "directory" as const,
      };
    });
  } catch {
    return [];
  }
}

function uniqueFeedRows(newsflash: NewsflashPost[], feed: FeedPost[]) {
  const newsflashKeys = new Set(newsflash.map((post) => contentKey(post.title, post.body)));
  return feed.filter((post) => !newsflashKeys.has(contentKey(post.title, post.body)));
}

function activityFromContent(newsflash: NewsflashPost[], feed: FeedPost[]): ActivityItem[] {
  const uniqueFeed = uniqueFeedRows(newsflash, feed);
  const items: ActivityItem[] = [
    ...newsflash.map((post) => ({
      id: `newsflash-${post.id}`,
      title: post.title,
      body: `Newsflash · ${post.author_label || "Board"}`,
      when: post.created_at,
      kind: "newsflash" as const,
    })),
    ...uniqueFeed.map((post) => ({
      id: post.id,
      title: post.title || post.body.slice(0, 72),
      body: `${post.author_role === "official" ? "Official" : "Alumni"} · ${post.author_label}`,
      when: post.created_at,
      kind: "feed" as const,
    })),
  ];
  return dedupeActivityItems(items.sort((a, b) => Date.parse(b.when) - Date.parse(a.when))).slice(0, 6);
}

function composeLockerLists(newsflash: NewsflashPost[], feedRows: FeedPost[]) {
  const uniqueFeed = uniqueFeedRows(newsflash, feedRows);
  const feed = dedupeFeedPosts([...newsflash.map(newsflashToFeedPost), ...uniqueFeed]).sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  return { feed, activity: activityFromContent(newsflash, uniqueFeed) };
}

function fallbackHome(reason: string): LockerHomeData {
  const newsflash = DEMO_NEWSFLASH;
  const { feed, activity } = composeLockerLists(newsflash, DEMO_FEED);
  return {
    usingFallback: true,
    fallbackReason: reason,
    newsflash,
    feed,
    upcomingEvent: upcomingFromNewsflash(newsflash) ?? DEMO_UPCOMING_EVENT,
    activity,
  };
}

function memoryHome(reason: string): LockerHomeData {
  const store = readFallback();
  const newsflash = store.newsflash;
  const { feed, activity } = composeLockerLists(newsflash, store.feed);
  return {
    usingFallback: true,
    fallbackReason: reason,
    newsflash,
    feed,
    upcomingEvent: upcomingFromNewsflash(newsflash) ?? DEMO_UPCOMING_EVENT,
    activity,
  };
}

export async function loadLockerHome(): Promise<LockerHomeData> {
  if (!getDatabaseUrl()) {
    return memoryHome(
      "DATABASE_URL is not set. Locker tables (`newsflash_posts`, `locker_feed_posts`) seed on first connected load. Newsflash publishes stay in this process until Neon is configured.",
    );
  }

  try {
    const [newsflash, feedRows, eventsEvent, directory] = await Promise.all([
      listNewsflashPosts(),
      listLockerFeedPosts(),
      loadEventsLaneEvent(),
      listDirectoryActivity(),
    ]);
    const { feed, activity: contentActivity } = composeLockerLists(newsflash, feedRows);
    const upcomingEvent = eventsEvent ?? upcomingFromNewsflash(newsflash) ?? DEMO_UPCOMING_EVENT;
    const activity = dedupeActivityItems(
      [...contentActivity, ...directory].sort((a, b) => Date.parse(b.when) - Date.parse(a.when)),
    ).slice(0, 6);
    return {
      usingFallback: false,
      fallbackReason: null,
      newsflash,
      feed,
      upcomingEvent,
      activity,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Locker tables could not be loaded. Set DATABASE_URL; tables seed on first connected load.";
    return fallbackHome(message);
  }
}
