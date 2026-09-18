import Link from "next/link";
import { CoachMessageForm } from "@/components/portal-forms";
import { PortalShell } from "@/components/portal-shell";
import { StatusCard } from "@/components/status-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listCoachMessages, listNewsflashPosts } from "@/lib/portal-queries";
import { canPostCoachMessage } from "@/lib/roles";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function PortalMessagesPage() {
  const viewer = await requireViewer();
  let messages: Awaited<ReturnType<typeof listCoachMessages>> = [];
  let news: Awaited<ReturnType<typeof listNewsflashPosts>> = [];
  let errorMessage: string | null = null;
  try {
    [messages, news] = await Promise.all([listCoachMessages(8), listNewsflashPosts(4)]);
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load messages.";
  }

  const threads = [
    {
      href: "/portal/messages#sgarlata",
      title: "Message from Sgarlata",
      preview: messages[0]?.body || "Official coach channel — no note yet",
      official: true,
    },
    {
      href: "/portal/newsflash",
      title: "Newsflash",
      preview: news[0]?.title || "Board channel — no post yet",
      official: true,
    },
    ...messages.slice(1).map((message) => ({
      href: `/portal/messages#${message.id}`,
      title: message.title || "Coach note",
      preview: message.body,
      official: false,
    })),
  ];

  return (
    <PortalShell viewer={viewer} current="messages">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Messages</p>
        <h2 className="font-heading text-3xl text-white">Inbox</h2>
        <p className="mt-1 text-sm text-white/65">
          Official channels are pinned. Coder 4 owns teammate threads beyond this list.
        </p>
      </div>
      {canPostCoachMessage(viewer.role) ? (
        <Card>
          <CardHeader>
            <CardTitle>New message from Coach</CardTitle>
          </CardHeader>
          <CardContent>
            <CoachMessageForm next="/portal/messages" />
          </CardContent>
        </Card>
      ) : null}
      {errorMessage ? <StatusCard title="Messages unavailable" body={errorMessage} /> : null}
      <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-gold/20 bg-[#0d1f3c]">
        {threads.map((thread) => (
          <Link key={thread.href} href={thread.href} className="block px-4 py-4 hover:bg-white/5">
            <p className="text-sm font-medium text-white">
              {thread.title}
              {thread.official ? <span className="ml-2 text-[11px] uppercase tracking-wide text-gold">Official</span> : null}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-white/55">{thread.preview}</p>
          </Link>
        ))}
      </div>
    </PortalShell>
  );
}
