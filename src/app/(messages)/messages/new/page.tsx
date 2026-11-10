import Link from "next/link";
import { MessagesNew } from "@/components/messages-new";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { dmParticipantId } from "@/lib/messages-dm";
import { requireMessageViewer } from "@/lib/messages-viewer";

export const dynamic = "force-dynamic";

export default async function NewMessagePage() {
  const viewer = await requireMessageViewer("/messages/new");
  const viewerAlumniId = dmParticipantId(viewer);
  const searchView = viewer.kind === "staff" || viewer.isAdmin ? "admin" : "alum";

  return (
    <PageMain width="narrow" className="pb-24 md:pb-8">
      <div className="space-y-3">
        <Link href="/messages" className="text-sm font-medium text-navy hover:underline">
          ← Messages
        </Link>
        <PageHeader
          title="New message"
          description="Search the directory and open a private thread. Existing conversations reuse the same chat."
        />
      </div>
      {viewerAlumniId ? (
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <MessagesNew view={searchView} viewerAlumniId={viewerAlumniId} heading={false} />
        </div>
      ) : (
        <StatusCard
          title="Claim your record to message"
          body="Preview sessions can't start a direct message. Sign in as a claimed Alum or as Admin."
        />
      )}
    </PageMain>
  );
}
