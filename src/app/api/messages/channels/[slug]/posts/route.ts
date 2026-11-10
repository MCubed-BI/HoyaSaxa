import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { jsonAccessDenied, wantsJsonRequest } from "@/lib/messages-api";
import { getMessageViewer } from "@/lib/messages-auth";
import { dmAuthorLabel, isDmChannel } from "@/lib/messages-dm";
import {
  createMessagePost,
  getViewerMessageChannel,
  markChannelReadForViewer,
} from "@/lib/messages";

function channelPath(slug: string) {
  return `/messages/${slug}`;
}

async function readPostInput(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { title?: string; body?: string };
    return {
      title: String(body.title ?? ""),
      body: String(body.body ?? "").trim(),
      json: true,
    };
  }
  const form = await request.formData();
  return {
    title: String(form.get("title") ?? ""),
    body: String(form.get("body") ?? "").trim(),
    json: wantsJsonRequest(request),
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const viewer = await getMessageViewer();
  const { slug } = await params;
  const input = await readPostInput(request);
  if (!viewer) {
    if (input.json) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!input.body) {
    if (input.json) return NextResponse.json({ error: "body is required" }, { status: 400 });
    return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
  }

  try {
    const channel = await getViewerMessageChannel(slug, viewer);
    const denied = jsonAccessDenied({ viewer, channel, action: "post" });
    if (denied) {
      if (input.json) return NextResponse.json({ error: denied.error }, { status: denied.status });
      if (!channel) {
        return NextResponse.redirect(new URL("/messages", request.url), { status: 303 });
      }
      return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
    }
    if (!channel) {
      if (input.json) return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      return NextResponse.redirect(new URL("/messages", request.url), { status: 303 });
    }

    const post = await createMessagePost({
      channelId: channel.id,
      title: input.title,
      body: input.body,
      authorRole: isDmChannel(channel) ? (viewer.isAdmin && !viewer.alumniId ? "admin" : viewer.kind) : "staff",
      authorLabel: isDmChannel(channel) ? dmAuthorLabel(viewer) : viewer.label,
    });
    await markChannelReadForViewer(channel.id, viewer);

    if (input.json) {
      return NextResponse.json({ ok: true, post });
    }
    return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      if (input.json) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
      return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
    }
    throw error;
  }
}
