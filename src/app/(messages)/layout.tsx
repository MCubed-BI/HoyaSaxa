import { AppHeader } from "@/components/app-header";
import { PageShell } from "@/components/page-chrome";
import { requireMessageViewer } from "@/lib/messages-viewer";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireMessageViewer();
  return (
    <PageShell>
      <AppHeader
        current="messages"
        shell={viewer.kind}
        viewerLabel={viewer.label}
        verifiedHoya={viewer.verifiedHoya}
      />
      {children}
    </PageShell>
  );
}
