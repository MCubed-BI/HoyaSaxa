import { PortalShell } from "@/components/portal-shell";
import { PortalTabs } from "@/components/portal-tabs";
import { StatusCard } from "@/components/status-card";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const viewer = await requireViewer();
  const tab = (await searchParams).tab ?? "overview";

  return (
    <PortalShell viewer={viewer} current="profile">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Once a Hoya, always a Hoya</p>
        <h2 className="font-heading text-3xl text-white">{viewer.label}</h2>
        <p className="mt-1 text-sm text-white/65">
          {viewer.alumniId ? `Claimed alumni id ${viewer.alumniId}` : "No alumniId on hoya_alum_session yet"}
        </p>
      </div>
      <PortalTabs
        tabs={[
          { href: "/portal/profile?tab=overview", label: "Overview", active: tab === "overview" },
          { href: "/portal/profile?tab=about", label: "About", active: tab === "about" },
          { href: "/portal/profile?tab=sport", label: "Sport", active: tab === "sport" },
          { href: "/portal/profile?tab=career", label: "Career", active: tab === "career" },
        ]}
      />
      <Card className="border-gold/15 bg-[#0d1f3c] text-white">
        <CardContent className="space-y-2 py-5 text-sm text-white/70">
          <p>About · sport · LinkedIn · location belong on this tab ({tab}).</p>
          <p>Coder 1 fills the athlete/alum profile. This shell only reserves the IA.</p>
        </CardContent>
      </Card>
      <StatusCard
        title="Coder 1 extension point"
        body="Register/Claim should set hoya_alum_session.alumniId. Do not rebuild claim UI here."
      />
    </PortalShell>
  );
}
