import { Badge } from "@/components/ui/badge";
import { type PublicBadge, badgeLabel, type BadgeType } from "@/lib/badges";

/**
 * Badge component API — Coder 4 / 5: reuse these chips. Do not add a second chip.
 *
 *   import { HoyaBadge, HoyaBadgeRow } from "@/components/hoya-badges";
 *   // barrel: import { HoyaBadge, HoyaBadgeRow } from "@/lib/badge-api";
 *
 *   <HoyaBadge badge={badge} />              // PublicBadge | BadgeType
 *   <HoyaBadgeRow badges={badges} />
 *
 * Labels only (`Verified Hoya`, `Donor · Platinum`, `Event top · Gold`).
 * Never pass or render donor `$` / `amount_cents`.
 * Event bands: consume Coder 4 ranks via `eventBadgeFromCoder4Totals` /
 * `listPublicBadgesMany(ids, { attendanceLeaders })` — no dual-write.
 */
export function HoyaBadge({ badge }: { badge: PublicBadge | BadgeType }) {
  const view = typeof badge === "string" ? { type: badge, label: badgeLabel(badge), tier: null } : badge;
  return (
    <Badge variant="secondary" data-badge-type={view.type} data-badge-tier={view.tier ?? ""}>
      {view.label}
    </Badge>
  );
}

export function HoyaBadgeRow({ badges }: { badges: Array<PublicBadge | BadgeType> }) {
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1" data-hoya-badges="">
      {badges.map((badge) => {
        const type = typeof badge === "string" ? badge : badge.type;
        return <HoyaBadge key={type} badge={badge} />;
      })}
    </div>
  );
}
