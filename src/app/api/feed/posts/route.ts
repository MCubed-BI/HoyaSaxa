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
import { safeNextPath } from "@/lib/safe-next";
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

async function readPostInput(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as {
      section?: string;
      title?: string;
      body?: string;
      event_at?: string;
      next?: string;
    };
    return {
      section: body.section,
      title: body.title,
      text: body.body,
      eventAt: body.event_at,
      next: body.next,
      wantsRedirect: false,
    };
  }

  const form = await request.formData();
  return {
    section: String(form.get("section") ?? ""),
    title: String(form.get("title") ?? ""),
    text: String(form.get("body") ?? ""),
    eventAt: String(form.get("event_at") ?? ""),
    next: String(form.get("next") ?? ""),
    wantsRedirect: true,
  };
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) {
    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/home/login", request.url), { status: 303 });
  }

  const input = await readPostInput(request);
  const section = canonicalizeFeedSection(input.section);
  const next = safeNextPath(input.next, section ? `/feed#${section}` : "/feed");

  if (!section) {
    if (input.wantsRedirect) {
      return NextResponse.redirect(new URL("/feed", request.url), { status: 303 });
    }
    return NextResponse.json({ error: "section must be brothers | board | sgarlata" }, { status: 400 });
  }
  if (!canPostToFeedSection(viewer.platformRole, section)) {
    if (input.wantsRedirect) {
      return NextResponse.redirect(new URL(next, request.url), { status: 303 });
    }
    return NextResponse.json(
      { error: deniedFeedSectionMessage(viewer.platformRole, section) },
      { status: 403 },
    );
  }

  const title = input.title?.trim() || null;
  const text = input.text?.trim() ?? "";
  if (!text) {
    if (input.wantsRedirect) {
      return NextResponse.redirect(new URL(next, request.url), { status: 303 });
    }
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  try {
    if (section === "board") {
      const eventDate = input.eventAt?.trim() ?? "";
      await createNewsflashPost({
        title: title || "Board note",
        body: text,
        eventAt: eventDate ? `${eventDate}T12:00:00.000Z` : null,
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
    if (input.wantsRedirect) {
      return NextResponse.redirect(new URL(next, request.url), { status: 303 });
    }
    return NextResponse.json({ ok: true, section, post });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      if (input.wantsRedirect) {
        return NextResponse.redirect(new URL(next, request.url), { status: 303 });
      }
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    throw error;
  }
}
