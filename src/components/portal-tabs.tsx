import Link from "next/link";

export function PortalTabs({
  tabs,
}: {
  tabs: Array<{ href: string; label: string; active?: boolean }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full px-3 py-1.5 text-sm ${
            tab.active ? "bg-navy text-white" : "bg-muted text-foreground hover:bg-accent"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
