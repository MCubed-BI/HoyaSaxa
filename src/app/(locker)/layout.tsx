import type { Metadata } from "next";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";

export const metadata: Metadata = {
  title: {
    default: "Home",
    template: `%s · ${PRODUCT_DISPLAY_NAME}`,
  },
};

export default function LockerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
