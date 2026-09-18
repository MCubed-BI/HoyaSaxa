import { CoachMessageForm } from "@/components/portal-forms";
import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listCoachMessages } from "@/lib/portal-queries";
import { canPostCoachMessage } from "@/lib/roles";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function MessagePage() {
  const viewer = await requireViewer();
  let messages: Awaited<ReturnType<typeof listCoachMessages>> = [];
  let errorMessage: string | null = null;

  try {
    messages = await listCoachMessages();
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load coach messages.";
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="message" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            From the program
          </p>
          <h2 className="font-heading text-3xl text-navy">Message from Coach Sgarlata</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Owner and coach can post. Alumni read the feed. Stored in Neon table <code>coach_messages</code>.
          </p>
        </div>

        {canPostCoachMessage(viewer.role) ? (
          <Card>
            <CardHeader>
              <CardTitle>New message</CardTitle>
            </CardHeader>
            <CardContent>
              <CoachMessageForm />
            </CardContent>
          </Card>
        ) : null}

        {errorMessage ? (
          <StatusCard title="Messages unavailable" body={errorMessage} />
        ) : messages.length === 0 ? (
          <StatusCard title="No messages yet" body="When Coach Sgarlata posts, the note will show here." />
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <Card key={message.id}>
                <CardHeader>
                  <CardTitle>{message.title || "Message from Coach"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {message.author_label || "Coach"} · {new Date(message.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
