import Link from "next/link";
import { pillClass } from "@/components/page-chrome";

export function PortalTabs({
  tabs,
}: {
  tabs: Array<{ href: string; label: string; active?: boolean }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className={pillClass(Boolean(tab.active))}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
