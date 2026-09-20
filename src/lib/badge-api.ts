/**
 * Badge component + consume API for Coder 4 / Coder 5.
 *
 * Coder 4 owns `event_checkins` persistence and lifetime ranks.
 * Import this module (or the paths below). Do not add a second chip.
 * Do not write check-ins from badge code. Never pass donor `$` / `amount_cents`.
 *
 * --- Component API ---
 *
 * ```ts
 * import { HoyaBadge, HoyaBadgeRow } from "@/components/hoya-badges";
 * // or: import { HoyaBadge, HoyaBadgeRow } from "@/lib/badge-api";
 *
 * <HoyaBadge badge={badge} />                 // PublicBadge | BadgeType
 * <HoyaBadgeRow badges={badges} />            // labels only — no $
 * ```
 *
 * `PublicBadge` = `{ type, label, tier }` where type is
 *   verified_hoya | donor_platinum|gold|silver|bronze | event_top_*
 *
 * --- Loaders ---
 *
 * ```ts
 * import {
 *   listPublicBadges,
 *   listPublicBadgesMany,
 *   eventBadgeFromCoder4Totals,
 *   attendanceLeadersFromCoder4Feed,
 * } from "@/lib/badge-api";
 *
 * // After Coder 4 Ready PR lands:
 * const feed = await listEventCheckinFeed({ alumId });
 * const totals = await getAlumAttendanceTotals(alumId);
 * const eventBadge = eventBadgeFromCoder4Totals(totals);
 * const badges = await listPublicBadgesMany(ids, {
 *   attendanceLeaders: attendanceLeadersFromCoder4Feed(feed),
 * });
 * ```
 *
 * HTTP: `GET /api/badges/:alumniId` → `{ alumniId, badges: PublicBadge[] }`
 *
 * Until Coder 4's feed is on main, loaders fall back to a SELECT-only
 * count of `event_checkins` (never INSERT).
 */
export { HoyaBadge, HoyaBadgeRow } from "@/components/hoya-badges";
export { VerifiedHoyaBadge } from "@/components/verified-hoya-badge";

export {
  BADGE_LABELS,
  BADGE_PERCENTILE_THRESHOLDS,
  BADGE_TYPES,
  assemblePublicBadges,
  badgeLabel,
  computeDonorBadge,
  computeEventTopBadge,
  donorBadgeType,
  eventBadgeFromCoder4Row,
  eventBadgeFromCoder4Totals,
  eventTierFromCoder4Feed,
  eventTopBadgeType,
  grantVerifiedHoya,
  isBadgeType,
  listPublicBadges,
  listPublicBadgesMany,
  percentileFromRank,
  publicBadgesJson,
  tierFromPercentile,
  toPublicBadge,
  type BadgeTier,
  type BadgeType,
  type PublicBadge,
} from "@/lib/badges";

export {
  EVENT_BADGE_FEED_VERSION,
  attendanceLeadersFromCoder4Feed,
  eventBadgeFeedFromCoder4Json,
  type Coder4AttendanceFeedResponse,
  type EventBadgeFeed,
  type EventBadgeFeedRow,
  type EventBadgeTotals,
  type EventCheckinFeedRow,
} from "@/lib/badge-event-feed";

export {
  coder4AttendanceFeedAvailable,
  tryCoder4AlumAttendanceTotals,
  tryCoder4AttendanceLeaders,
} from "@/lib/consume-coder4-feed";
