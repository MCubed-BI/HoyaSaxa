import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legacy Locker",
};

export default function LockerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="locker-shell flex min-h-full flex-col bg-background text-foreground">{children}</div>
  );
}
