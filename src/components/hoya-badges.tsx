import { Badge } from "@/components/ui/badge";
import { type PublicBadge, badgeLabel, type BadgeType } from "@/lib/badges";

/**
 * Display-only chips from `@/lib/badges` (contracts PR).
 * Coder 4 / Coder 5: reuse HoyaBadge + HoyaBadgeRow. Do not add a second chip.
 * Load with `listPublicBadges` / `listPublicBadgesMany` / `computeEventTopBadge`.
 * Never pass or render donor dollar amounts.
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
