import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function MeHookPage() {
  const viewer = await requireViewer();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="me" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Account</p>
          <h2 className="font-heading text-3xl text-navy">My alumni record</h2>
        </div>
        <StatusCard
          title="Claim editor lives on Register/Claim"
          body={
            viewer.alumniId
              ? `This session is tied to alumni id ${viewer.alumniId}. The Football Program Register/Claim branch owns the editor and merge UI at /me.`
              : "No claim is attached yet. When Register/Claim ships, signing in there sets ga_alumni_session and links this portal to your alumni id."
          }
        />
        <p className="text-sm text-muted-foreground">
          <Link href="/alum" className="text-navy hover:underline">
            Back to the alum portal
          </Link>
        </p>
      </main>
    </div>
  );
}
