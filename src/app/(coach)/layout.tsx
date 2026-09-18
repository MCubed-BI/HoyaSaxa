import { SelectionProvider } from "@/components/selection-provider";
import { requireRole } from "@/lib/viewer";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "coach", "board"]);
  return <SelectionProvider>{children}</SelectionProvider>;
}
