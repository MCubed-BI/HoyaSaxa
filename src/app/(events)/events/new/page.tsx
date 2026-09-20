import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/create-event-form";
import { EventsChrome } from "@/components/events-chrome";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { canCreateEvents } from "@/lib/event-auth";
import { getEventActor } from "@/lib/event-actor";
import { getLockerViewer } from "@/lib/locker-viewer";
import { platformRoleLabel } from "@/lib/platform-roles";

export const dynamic = "force-dynamic";

export default async function CreateEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const [actor, locker] = await Promise.all([getEventActor(), getLockerViewer()]);
  if (!actor || !canCreateEvents(actor)) {
    redirect("/events?error=forbidden");
  }

  const roleLabel = actor.platformRole ? platformRoleLabel(actor.platformRole) : "Alumnus";

  return (
    <EventsChrome locker={locker}>
      <PageMain width="form">
        <PageHeader
          eyebrow={roleLabel}
          title="New event"
          description="Admin, Board, and Alum can post events. Times are Eastern. This is not From Sgarlata."
        />
        <CreateEventForm error={params.error} />
      </PageMain>
    </EventsChrome>
  );
}
