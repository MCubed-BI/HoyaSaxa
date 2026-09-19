import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/create-event-form";
import { EventsChrome } from "@/components/events-chrome";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { canCreateEvents } from "@/lib/event-auth";
import { getEventActor } from "@/lib/event-actor";
import { getLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function CreateEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const [actor, locker] = await Promise.all([getEventActor(), getLockerViewer()]);
  if (!actor || !canCreateEvents(actor.role)) {
    redirect("/events?error=forbidden");
  }

  return (
    <EventsChrome locker={locker}>
      <PageMain width="form">
        <PageHeader
          eyebrow="Coach / board"
          title="New event"
          description="Only coach and board staff can create events. Times are Eastern."
        />
        <CreateEventForm error={params.error} />
      </PageMain>
    </EventsChrome>
  );
}
