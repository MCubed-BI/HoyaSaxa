import { SelectionProvider } from "@/components/selection-provider";
import { getLockerViewer } from "@/lib/locker-viewer";
import { getCurrentViewer, requireRole } from "@/lib/viewer";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getCurrentViewer();
  const staff = viewer && (viewer.role === "owner" || viewer.role === "coach" || viewer.role === "board");
  if (!staff) {
    const locker = await getLockerViewer();
    if (!locker) {
      await requireRole(["owner", "coach", "board"]);
    }
  }
  return <SelectionProvider>{children}</SelectionProvider>;
}
