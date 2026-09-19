import { BlastComposer } from "@/components/blast-composer";
import { LockerHeader } from "@/components/locker-header";
import { SelectionProvider } from "@/components/selection-provider";
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
      <div className="flex min-h-full flex-col">
        <LockerHeader current="blast" viewer={viewer} />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Alumni outreach
            </p>
            <h2 className="font-heading text-3xl text-navy">Email classmates</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Compose email to alumni you selected on the directory. Send uses the same{" "}
              <code>sendProviderEmail</code> Gmail SMTP path as staff when{" "}
              <code>GMAIL_USER</code> and <code>GMAIL_APP_PASSWORD</code> are set (From is that
              mailbox). Without those, Prepare opens a Gmail or mailto draft. Coach filter blast,
              Twilio text, and Data Sync stay staff-only.
            </p>
          </div>
          <BlastComposer filters={emptyFilters()} initialChannel="email" mode="alum" />
        </main>
      </div>
    </SelectionProvider>
  );
}
