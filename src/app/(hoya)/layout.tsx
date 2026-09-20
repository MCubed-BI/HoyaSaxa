import { HoyaDirectoryHeader } from "@/components/hoya-directory-header";
import { SelectionProvider } from "@/components/selection-provider";
import { getLockerViewer } from "@/lib/locker-viewer";

export default async function HoyaLayout({ children }: { children: React.ReactNode }) {
  const locker = await getLockerViewer();
  const signedIn = Boolean(locker);

  return (
    <div className={signedIn ? "flex min-h-full flex-col pb-24 md:pb-0" : "flex min-h-full flex-col"}>
      <HoyaDirectoryHeader
        signedIn={signedIn}
        roleLabel={locker?.roleLabel}
        viewerLabel={locker?.label}
        canEmailClassmates={locker?.role !== "coach"}
        verifiedHoya={locker?.verifiedHoya}
      />
      <SelectionProvider>{children}</SelectionProvider>
    </div>
  );
}
