import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function MeHookPage() {
  const viewer = await requireViewer();
  const body = (
    <>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Account</p>
        <h2 className="font-heading text-3xl">My alumni record</h2>
      </div>
      <StatusCard
        title="Claim editor lives on Register/Claim"
        body={
          viewer.alumniId
            ? `This session is tied to alumni id ${viewer.alumniId}. Football Program owns the editor at /me.`
            : "No claim is attached yet. Register/Claim should set hoya_alum_session with alumniId. ga_alumni_session is still accepted as a fallback hook."
        }
      />
      <p className="text-sm text-muted-foreground">
        <Link href="/portal" className="text-navy hover:underline">
          Back to Legacy Locker
        </Link>
      </p>
    </>
  );

  if (viewer.role === "alum" || viewer.role === "board") {
    return (
      <PortalShell viewer={viewer} current="me">
        {body}
      </PortalShell>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="me" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">{body}</main>
    </div>
  );
}
