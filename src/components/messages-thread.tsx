"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Timestamp } from "@/components/timestamp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  groupMessagesByDay,
  isNearBottom,
  isOutgoingMessage,
  THREAD_POLL_MS,
} from "@/lib/messages-ui";
import { cn } from "cn";

export type ThreadPost = {
  id: string;
  title: string | null;
  body: string;
  author_label: string | null;
  author_role: string | null;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
};

function latestRealId(posts: ThreadPost[]) {
  for (let index = posts.length - 1; index >= 0; index -= 1) {
    const id = posts[index]?.id;
    if (id && !id.startsWith("temp-")) return id;
  }
  return null;
}

function mergeIncoming(current: ThreadPost[], incoming: ThreadPost[]) {
  const seen = new Set(current.map((post) => post.id));
  const next = [...current];
  for (const post of incoming) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    next.push(post);
  }
  const realKeys = new Set(
    next.filter((post) => !post.id.startsWith("temp-")).map((post) => `${post.author_label ?? ""}\0${post.body}`),
  );
  return next.filter((post) => !post.id.startsWith("temp-") || !realKeys.has(`${post.author_label ?? ""}\0${post.body}`));
}

export function MessagesThread({
  slug,
  mode,
  canPost,
  viewerLabel,
  initialPosts,
  hasMoreBefore: initialHasMoreBefore,
}: {
  slug: string;
  mode: "dm" | "official";
  canPost: boolean;
  viewerLabel: string;
  initialPosts: ThreadPost[];
  hasMoreBefore: boolean;
}) {
  const isDm = mode === "dm";
  const [posts, setPosts] = useState<ThreadPost[]>(initialPosts);
  const [hasMoreBefore, setHasMoreBefore] = useState(initialHasMoreBefore);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const postsRef = useRef(posts);
  const tempSeq = useRef(0);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const scrollToBottom = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
    void fetch(`/api/messages/channels/${encodeURIComponent(slug)}/read`, { method: "POST" });
  }, [scrollToBottom, slug]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    function onScroll() {
      if (!scrollerRef.current) return;
      stickToBottom.current = isNearBottom(scrollerRef.current);
    }
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  const markRead = useCallback(() => {
    void fetch(`/api/messages/channels/${encodeURIComponent(slug)}/read`, { method: "POST" });
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.hidden) return;
      const after = latestRealId(postsRef.current);
      const params = after ? `?after=${encodeURIComponent(after)}` : "";
      try {
        const response = await fetch(`/api/messages/channels/${encodeURIComponent(slug)}${params}`, {
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { posts?: ThreadPost[] };
        if (cancelled || !Array.isArray(data.posts) || data.posts.length === 0) return;
        const hadIncoming = data.posts.some((post) => !isOutgoingMessage(post.author_label, viewerLabel));
        setPosts((current) => mergeIncoming(current, data.posts ?? []));
        if (hadIncoming) markRead();
        if (stickToBottom.current) {
          requestAnimationFrame(scrollToBottom);
        }
      } catch {
        // Keep the last transcript if a poll fails.
      }
    }

    const timer = window.setInterval(() => void poll(), THREAD_POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [markRead, scrollToBottom, slug, viewerLabel]);

  async function loadEarlier() {
    const oldest = posts.find((post) => !post.id.startsWith("temp-"));
    if (!oldest || loadingEarlier) return;
    setLoadingEarlier(true);
    setLoadError(null);
    const scroller = scrollerRef.current;
    const previousHeight = scroller?.scrollHeight ?? 0;
    try {
      const response = await fetch(
        `/api/messages/channels/${encodeURIComponent(slug)}?before=${encodeURIComponent(oldest.id)}`,
        { credentials: "same-origin" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        posts?: ThreadPost[];
        hasMoreBefore?: boolean;
        error?: string;
      };
      if (!response.ok) {
        setLoadError(data.error || "Could not load earlier messages.");
        return;
      }
      const earlier = data.posts ?? [];
      setHasMoreBefore(Boolean(data.hasMoreBefore));
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        return [...earlier.filter((post) => !seen.has(post.id)), ...current];
      });
      requestAnimationFrame(() => {
        if (!scroller) return;
        scroller.scrollTop = scroller.scrollHeight - previousHeight;
      });
    } catch {
      setLoadError("Could not load earlier messages.");
    } finally {
      setLoadingEarlier(false);
    }
  }

  async function postMessage(input: { title?: string; body: string; tempId?: string }) {
    const text = input.body.trim();
    if (!text) return false;
    tempSeq.current += 1;
    const tempId = input.tempId ?? `temp-${tempSeq.current}`;
    const optimistic: ThreadPost = {
      id: tempId,
      title: isDm ? null : input.title?.trim() || null,
      body: text,
      author_label: viewerLabel,
      author_role: "alum",
      created_at: new Date().toISOString(),
      pending: true,
      failed: false,
    };

    if (!input.tempId) {
      setPosts((current) => [...current, optimistic]);
      stickToBottom.current = true;
      requestAnimationFrame(scrollToBottom);
    } else {
      setPosts((current) =>
        current.map((post) => (post.id === tempId ? { ...post, pending: true, failed: false } : post)),
      );
    }

    try {
      const response = await fetch(`/api/messages/channels/${encodeURIComponent(slug)}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ title: input.title ?? "", body: text }),
      });
      const data = (await response.json().catch(() => ({}))) as { post?: ThreadPost; error?: string };
      if (!response.ok || !data.post) {
        setPosts((current) =>
          current.map((post) => (post.id === tempId ? { ...post, pending: false, failed: true } : post)),
        );
        setSendError(data.error || "Could not send. Tap retry.");
        return false;
      }
      setPosts((current) => current.map((post) => (post.id === tempId ? { ...data.post!, pending: false } : post)));
      setSendError(null);
      markRead();
      return true;
    } catch {
      setPosts((current) =>
        current.map((post) => (post.id === tempId ? { ...post, pending: false, failed: true } : post)),
      );
      setSendError("Could not send. Tap retry.");
      return false;
    }
  }

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (sending) return;
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const ok = await postMessage({ title, body: text });
    if (ok) {
      setBody("");
      if (!isDm) setTitle("");
    }
    setSending(false);
  }

  function onComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  const groups = groupMessagesByDay(posts);

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="messages-thread">
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto px-0.5 py-2"
        data-testid="messages-thread-scroller"
      >
        {hasMoreBefore ? (
          <div className="mb-3 flex justify-center">
            <Button type="button" variant="outline" size="sm" onClick={() => void loadEarlier()} disabled={loadingEarlier}>
              {loadingEarlier ? "Loading…" : "Load earlier"}
            </Button>
          </div>
        ) : null}
        {loadError ? (
          <p role="alert" className="mb-3 text-center text-sm text-destructive">
            {loadError}
          </p>
        ) : null}

        {posts.length === 0 ? (
          <p className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
            {isDm ? "Send the first note to start this thread." : "When staff publish, the note will show here."}
          </p>
        ) : isDm ? (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.key} className="space-y-2">
                <p className="sticky top-0 z-10 py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {group.posts.map((post) => {
                  const outgoing = isOutgoingMessage(post.author_label, viewerLabel);
                  return (
                    <article
                      key={post.id}
                      data-pending={post.pending ? "true" : undefined}
                      data-failed={post.failed ? "true" : undefined}
                      className={cn("flex", outgoing ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-[var(--shadow-xs)]",
                          outgoing
                            ? "rounded-br-md bg-navy text-navy-foreground"
                            : "rounded-bl-md border bg-card text-foreground",
                          post.pending && "opacity-70",
                          post.failed && "ring-2 ring-destructive/40",
                        )}
                      >
                        {!outgoing ? (
                          <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">{post.author_label}</p>
                        ) : null}
                        <p className="whitespace-pre-wrap">{post.body}</p>
                        <p className={cn("mt-1 text-[10px]", outgoing ? "text-navy-foreground/70" : "text-muted-foreground")}>
                          <Timestamp value={post.created_at} prefer="absolute" />
                          {post.pending ? " · Sending" : null}
                          {post.failed ? " · Not sent" : null}
                        </p>
                        {post.failed ? (
                          <button
                            type="button"
                            className="mt-1 text-[11px] font-medium underline"
                            onClick={() => void postMessage({ body: post.body, tempId: post.id })}
                          >
                            Retry
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <section key={group.key} className="space-y-3">
                <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {group.posts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <CardTitle>{post.title || "Message"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="whitespace-pre-wrap text-sm">{post.body}</p>
                      <p className="text-xs text-muted-foreground">
                        {post.author_label || "Staff"} · <Timestamp value={post.created_at} />
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      {canPost ? (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="sticky bottom-0 z-20 mt-3 space-y-2 border-t bg-background/95 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        >
          {isDm ? null : (
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="From Coach Sgarlata"
              />
            </div>
          )}
          <div className="flex items-end gap-2">
            <Label htmlFor="body" className="sr-only">
              Message
            </Label>
            <Textarea
              id="body"
              name="body"
              required
              rows={isDm ? 2 : 4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder={isDm ? "Write a direct message." : "Write the note alumni will read."}
              className="min-h-11 flex-1"
            />
            <Button type="submit" disabled={sending || !body.trim()}>
              {isDm ? "Send" : "Post"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
          {sendError ? (
            <p role="alert" className="text-sm text-destructive">
              {sendError}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Board and alumni can read this channel. Only Admin can compose From Sgarlata.
        </p>
      )}
    </div>
  );
}
