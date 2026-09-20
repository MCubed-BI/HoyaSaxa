import { Badge } from "@/components/ui/badge";
import { type PublicBadge, badgeLabel, type BadgeType, tierFromBadgeType } from "@/lib/badges";

/**
 * Badge component API — Coder 4 / 5: reuse these chips. Do not add a second chip.
 *
 *   import { HoyaBadge, HoyaBadgeRow } from "@/lib/badge-api";
 *
 *   <HoyaBadge badge={badge} />              // PublicBadge | BadgeType
 *   <HoyaBadgeRow badges={badges} />
 *
 * Labels only (`Verified Hoya`, `Donor · Platinum`, `Top Tailgate · Gold`).
 * Never pass or render donor `$` / `amount_cents`.
 * Event bands: consume Coder 4 ranks via `eventBadgeFromCoder4Totals` /
 * `listPublicBadgesMany(ids, { attendanceLeaders })` — no dual-write.
 */
const BADGE_TONE: Record<string, string> = {
  verified_hoya: "border-navy bg-navy text-white",
  platinum: "border-[#c5b358] bg-[#c5b358]/20 text-navy",
  gold: "border-amber-500 bg-amber-50 text-navy",
  silver: "border-slate-400 bg-slate-100 text-navy",
  bronze: "border-amber-800/70 bg-amber-50 text-navy",
};

function badgeTone(type: BadgeType, tier: string | null) {
  if (type === "verified_hoya") return BADGE_TONE.verified_hoya;
  return BADGE_TONE[tier ?? ""] ?? "border-navy/30 bg-secondary text-navy";
}

export function HoyaBadge({ badge }: { badge: PublicBadge | BadgeType }) {
  const view =
    typeof badge === "string"
      ? { type: badge, label: badgeLabel(badge), tier: tierFromBadgeType(badge) }
      : badge;
  return (
    <Badge
      variant="outline"
      data-badge-type={view.type}
      data-badge-tier={view.tier ?? ""}
      className={badgeTone(view.type, view.tier)}
    >
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
