import { PortalShell } from "@/components/portal-shell";
import { StatusCard } from "@/components/status-card";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const viewer = await requireViewer();
  return (
    <PortalShell viewer={viewer} current="profile">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Profile</p>
        <h2 className="font-heading text-3xl text-white">{viewer.label}</h2>
      </div>
      <StatusCard
        title="Coder 1 extension point"
        body={
          viewer.alumniId
            ? `Session alumni id ${viewer.alumniId}. Replace this stub with overview, about, sport, LinkedIn, and location.`
            : "No claim is attached yet. Register/Claim should set hoya_alum_session.alumniId when the roster row is claimed."
        }
      />
    </PortalShell>
  );
}
