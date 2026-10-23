"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOYA_AI_NAME } from "@/lib/hoya-ai-brand";
import { cn } from "cn";

const HIDDEN_PATH_PREFIXES = ["/login", "/alumni-login", "/register", "/home/login"];

const SUGGESTIONS = [
  "How do I use Find My Alum?",
  "Find people in New Jersey",
  "Draft a game-day SMS blast",
  "What events are coming up?",
];

function messageText(message: UIMessage) {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function toolLinks(message: UIMessage) {
  const links: Array<{ href: string; label: string }> = [];
  for (const part of message.parts) {
    if (!part.type.startsWith("tool-")) continue;
    const toolPart = part as {
      type: string;
      state?: string;
      output?: {
        href?: string;
        label?: string;
        title?: string;
        blastHref?: string;
        profilePath?: string;
        name?: string;
        people?: Array<{ profilePath?: string; athletePath?: string; name?: string }>;
      };
    };
    if (toolPart.state !== "output-available" || !toolPart.output) continue;
    const out = toolPart.output;
    if (out.href) {
      links.push({ href: out.href, label: out.label || out.title || "Open" });
    }
    if (out.blastHref) {
      links.push({ href: out.blastHref, label: "Open Blast" });
    }
    if (out.profilePath && out.name) {
      links.push({ href: out.profilePath, label: out.name });
    }
    for (const person of out.people ?? []) {
      const href = person.profilePath || person.athletePath;
      if (href && person.name) links.push({ href, label: person.name });
    }
  }
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.href}|${link.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toolActivity(message: UIMessage) {
  const labels: string[] = [];
  for (const part of message.parts) {
    if (!part.type.startsWith("tool-")) continue;
    const name = part.type.replace(/^tool-/, "");
    const pretty =
      name === "searchPeople"
        ? "Searching people"
        : name === "listPeople"
          ? "Listing people"
          : name === "countPeople"
            ? "Counting people"
            : name === "lookupPerson"
              ? "Opening profile"
              : name === "listUpcomingEvents"
                ? "Checking events"
                : name === "explainFeature"
                  ? "Looking up help"
                  : name === "openLink"
                    ? "Preparing link"
                    : name === "draftBlast"
                      ? "Drafting blast"
                      : name;
    if (!labels.includes(pretty)) labels.push(pretty);
  }
  return labels;
}

export function HoyaAiChat() {
  const pathname = usePathname() || "";
  const hidden = HIDDEN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/hoya-ai/chat",
      }),
    [],
  );

  const { messages, sendMessage, status, error, clearError, setMessages } = useChat({
    transport,
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, busy]);

  async function onSubmit(event?: { preventDefault?: () => void }) {
    event?.preventDefault?.();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    clearError();
    await sendMessage({ text });
  }

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-end p-3 sm:p-4">
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {open ? (
          <section
            className="flex h-[min(34rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-navy/15 bg-card shadow-[0_18px_50px_-24px_rgba(4,30,66,0.55)]"
            aria-label={HOYA_AI_NAME}
          >
            <header className="flex items-center gap-2 border-b bg-navy px-3 py-2.5 text-navy-foreground">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-gold text-gold-foreground">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight">{HOYA_AI_NAME}</p>
                <p className="truncate text-[11px] text-navy-foreground/75">Help · search · draft blasts</p>
              </div>
              <button
                type="button"
                className="rounded-md p-1.5 text-navy-foreground/80 hover:bg-white/10 hover:text-navy-foreground"
                aria-label={`Close ${HOYA_AI_NAME}`}
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Ask me how to use the site, find Hoyas, check events, or draft a blast. I can run those
                    tasks for you.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="rounded-full border border-navy/15 bg-background px-2.5 py-1 text-left text-xs text-navy hover:border-gold hover:bg-gold/10"
                        onClick={() => {
                          clearError();
                          void sendMessage({ text: suggestion });
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((message) => {
                const text = messageText(message);
                const links = toolLinks(message);
                const activity = message.role === "assistant" ? toolActivity(message) : [];
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[95%] rounded-2xl px-3 py-2",
                      message.role === "user"
                        ? "ml-auto bg-navy text-navy-foreground"
                        : "mr-auto border border-navy/10 bg-background text-foreground",
                    )}
                  >
                    {activity.length ? (
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gold">
                        {activity.join(" · ")}
                      </p>
                    ) : null}
                    {text ? <p className="whitespace-pre-wrap leading-relaxed">{text}</p> : null}
                    {links.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {links.map((link) => (
                          <Button key={`${message.id}-${link.href}-${link.label}`} asChild size="sm" variant="secondary">
                            <Link href={link.href}>{link.label}</Link>
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {busy ? (
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  Hoya AI is working…
                </p>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <p>{error.message || "Something went wrong."}</p>
                  <button
                    type="button"
                    className="mt-1 underline"
                    onClick={() => {
                      clearError();
                      setMessages([]);
                    }}
                  >
                    Clear and try again
                  </button>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={onSubmit} className="border-t bg-card p-2.5">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={2}
                  disabled={busy}
                  placeholder="Ask Hoya AI…"
                  className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-navy/15 bg-background px-3 py-2 text-sm outline-none focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/30"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void onSubmit();
                    }
                  }}
                />
                <Button type="submit" disabled={busy || !input.trim()} className="shrink-0">
                  Send
                </Button>
              </div>
            </form>
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-navy-foreground shadow-[0_12px_30px_-12px_rgba(4,30,66,0.7)] transition hover:bg-navy/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          aria-expanded={open}
          aria-controls={undefined}
        >
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-gold text-gold-foreground">
            {open ? <X className="size-3.5" /> : <MessageCircle className="size-3.5" />}
          </span>
          {HOYA_AI_NAME}
        </button>
      </div>
    </div>
  );
}
