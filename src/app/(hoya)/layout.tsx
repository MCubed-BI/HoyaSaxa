import { HoyaDirectoryHeader } from "@/components/hoya-directory-header";
import { SelectionProvider } from "@/components/selection-provider";
import { getLockerViewer } from "@/lib/locker-viewer";

export default async function HoyaLayout({ children }: { children: React.ReactNode }) {
  const locker = await getLockerViewer();
  const signedIn = Boolean(locker);

  return (
    <div className="flex min-h-full flex-col">
      <HoyaDirectoryHeader locker={locker} signedIn={signedIn} />
      <SelectionProvider>{children}</SelectionProvider>
    </div>
  );
}
