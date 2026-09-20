import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import {
  canPostToFeedSection,
  canonicalizeFeedSection,
  deniedFeedSectionMessage,
  parseFeedSectionParam,
  type FeedSection,
} from "@/lib/feed-sections";
import { createNewsflashPost, createSectionFeedPost, listNewsflashPosts, listLockerFeedPosts } from "@/lib/locker-queries";
import { dedupeFeedPosts, filterFeedPostsBySection, newsflashToFeedPost } from "@/lib/locker-data";
import { getCurrentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

async function listSectionPosts(section: FeedSection) {
  const [feed, newsflash] = await Promise.all([
    listLockerFeedPosts(),
    section === "board" ? listNewsflashPosts() : Promise.resolve([]),
  ]);
  const posts = dedupeFeedPosts([...newsflash.map(newsflashToFeedPost), ...feed]);
  return filterFeedPostsBySection(posts, section);
}

export async function GET(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const section = parseFeedSectionParam(url.searchParams.get("section"), "brothers");
  if (!section) {
    return NextResponse.json({ error: "Unknown feed section" }, { status: 400 });
  }

  try {
    const posts = await listSectionPosts(section);
    return NextResponse.json({ section, posts });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ section, posts: [] });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    section?: string;
    title?: string;
    body?: string;
  };
  const section = canonicalizeFeedSection(body.section);
  if (!section) {
    return NextResponse.json({ error: "section must be brothers | board | sgarlata" }, { status: 400 });
  }
  if (!canPostToFeedSection(viewer.platformRole, section)) {
    return NextResponse.json(
      { error: deniedFeedSectionMessage(viewer.platformRole, section) },
      { status: 403 },
    );
  }

  const title = body.title?.trim() || null;
  const text = body.body?.trim() ?? "";
  if (!text) return NextResponse.json({ error: "body is required" }, { status: 400 });

  try {
    if (section === "board") {
      await createNewsflashPost({
        title: title || "Board note",
        body: text,
        authorLabel: viewer.label,
      });
    }
    const post = await createSectionFeedPost({
      section,
      title,
      body: text,
      authorLabel: viewer.label,
      authorRole: section === "brothers" ? "alum" : "official",
    });
    return NextResponse.json({ ok: true, section, post });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    throw error;
  }
}
