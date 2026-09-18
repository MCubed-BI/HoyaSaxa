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

  return (
    <PortalShell viewer={viewer} current="messages">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Messages</p>
        <h2 className="font-heading text-3xl text-white">Official channels</h2>
        <p className="mt-1 text-sm text-white/65">
          Message from Sgarlata is pinned here. Board Newsflash is the other official channel.
          Coder 4 owns threads beyond this feed.
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
      {errorMessage ? (
        <StatusCard title="Messages unavailable" body={errorMessage} />
      ) : (
        <>
          <Card className="border-gold/30">
            <CardHeader>
              <CardTitle>Message from Sgarlata</CardTitle>
            </CardHeader>
            <CardContent>
              {messages[0] ? (
                <p className="whitespace-pre-wrap text-sm">{messages[0].body}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No coach note yet.</p>
              )}
            </CardContent>
          </Card>
          {news[0] ? (
            <Card>
              <CardHeader>
                <CardTitle>Newsflash · {news[0].title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{news[0].body}</p>
              </CardContent>
            </Card>
          ) : null}
          <div className="space-y-3">
            {messages.slice(1).map((message) => (
              <Card key={message.id}>
                <CardHeader>
                  <CardTitle>{message.title || "Coach note"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </PortalShell>
  );
}
