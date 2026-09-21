import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessagesCompose } from "@/components/messages-compose";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayName } from "@/lib/format";
import { toNameFields } from "@/lib/locker-classify";
import { getLockerPersonById } from "@/lib/locker-directory";
import { athleteHref } from "@/lib/locker-paths";
import { findOrCreateDmChannel, getMessageChannel } from "@/lib/messages";
import { canMessageAthlete, dmChannelSlug, messageAthleteHref } from "@/lib/messages-dm";
import { requireMessageViewer } from "@/lib/messages-viewer";

export const dynamic = "force-dynamic";

export default async function MessageWithAlumPage({
  params,
}: {
  params: Promise<{ alumniId: string }>;
}) {
  const { alumniId } = await params;
  const viewer = await requireMessageViewer(messageAthleteHref(alumniId));
  const person = await getLockerPersonById(alumniId);
  if (!person) notFound();

  const senderId = viewer.alumniId?.trim() ?? "";
  if (!canMessageAthlete({ viewerAlumniId: senderId, recipientAlumniId: person.id })) {
    redirect(senderId && senderId.toLowerCase() === person.id.toLowerCase() ? "/messages" : "/alumni-login");
  }

  const existing = await getMessageChannel(dmChannelSlug(senderId, person.id), viewer.viewerKey, senderId);
  if (existing) {
    redirect(`/messages/${existing.slug}`);
  }

  const name = displayName(toNameFields(person));
  const email = person.emails.find(Boolean);

  try {
    const created = await findOrCreateDmChannel({
      sender: { alumniId: senderId, name: viewer.label },
      recipient: { alumniId: person.id, name },
    });
    redirect(`/messages/${created.slug}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
  }

  return (
    <PageMain width="narrow" className="pb-24 md:pb-8">
      <div className="space-y-3">
        <Link href="/messages" className="text-sm font-medium text-navy hover:underline">
          ← Messages
        </Link>
        <PageHeader
          title={name}
          description={`Start a direct message with ${name}. The thread will show in Messages for both of you.`}
          actions={<Badge variant="outline">Direct</Badge>}
        />
        <Link href={athleteHref(person.id)} className="text-sm font-medium text-navy hover:underline">
          Back to profile
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Send message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MessagesCompose
            variant="dm"
            action="/api/messages/dm"
            recipientName={name}
            hiddenFields={{ recipientAlumniId: person.id }}
          />
          {email ? (
            <p className="text-sm text-muted-foreground">
              In-app message is preferred.{" "}
              <a href={`mailto:${email}`} className="text-navy underline-offset-4 hover:underline">
                Email {name} instead
              </a>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </PageMain>
  );
}
