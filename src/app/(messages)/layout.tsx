import { AppHeader } from "@/components/app-header";
import { requireMessageViewer } from "@/lib/messages-viewer";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireMessageViewer();
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader current="messages" shell={viewer.kind} />
      {children}
    </div>
  );
}
