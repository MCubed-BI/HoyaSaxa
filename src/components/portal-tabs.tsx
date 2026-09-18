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
            tab.active ? "bg-gold text-gold-foreground" : "border border-gold/30 text-white/75 hover:bg-white/10"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
