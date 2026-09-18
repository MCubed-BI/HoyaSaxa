import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CreateEventForm } from "@/components/create-event-form";
import { SESSION_COOKIE } from "@/lib/auth";
import { canCreateEvents, getEventActorFromToken } from "@/lib/event-auth";

export const dynamic = "force-dynamic";

export default async function CreateEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const actor = getEventActorFromToken(jar.get(SESSION_COOKIE)?.value);
  if (!actor || !canCreateEvents(actor.role)) {
    redirect("/events?error=forbidden");
  }

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader current="events" />
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
    </div>
  );
}
