import { SelectionProvider } from "@/components/selection-provider";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <SelectionProvider>{children}</SelectionProvider>;
}
