import { BlastComposer } from "@/components/blast-composer";
import { LockerHeader } from "@/components/locker-header";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { SelectionProvider } from "@/components/selection-provider";
import { LoadedStamp } from "@/components/timestamp";
import { emptyFilters } from "@/lib/filters";
import { requireLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Email classmates",
  description: "Email selected alumni from the Hoya Directory.",
};

export default async function PortalAlumBlastPage() {
  const viewer = await requireLockerViewer("/login");

  return (
    <SelectionProvider>
      <PageShell>
        <LockerHeader current="blast" viewer={viewer} />
        <PageMain width="narrow" className="pb-24 md:pb-8">
          <PageHeader
            eyebrow="Alumni outreach"
            title="Email classmates"
            description="Compose email to alumni you selected on the directory. Send uses the same Gmail SMTP path as staff when configured. Without those, Prepare opens a Gmail or mailto draft. Coach filter blast, Twilio text, and Data Sync stay staff-only."
          />
          <LoadedStamp value={new Date().toISOString()} />
          <BlastComposer filters={emptyFilters()} initialChannel="email" mode="alum" />
        </PageMain>
      </PageShell>
    </SelectionProvider>
  );
}
