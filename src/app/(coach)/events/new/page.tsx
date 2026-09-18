import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/create-event-form";
import { EventsChrome } from "@/components/events-chrome";
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
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Coach / board</p>
          <h2 className="font-heading text-3xl text-navy">New event</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only coach and board staff can create events. Times are Eastern.
          </p>
        </div>
        <CreateEventForm error={params.error} />
      </main>
    </EventsChrome>
  );
}
