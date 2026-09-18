import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
};

export default function LockerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
