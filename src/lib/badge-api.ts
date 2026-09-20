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
 * <HoyaBadgeRow badges={badges} />            // Verified Hoya / Donor / Top Tailgate — no $
 * ```
 *
 * `PublicBadge` = `{ type, label, tier }` where type is
 *   verified_hoya | donor_platinum|gold|silver|bronze | event_top_* (Top Tailgate)
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
 * const feed = await listEventCheckinFeed({ alumId }); // Coder 4 PR #15
 * const totals = await getAlumAttendanceTotals(alumId);
 * const eventBadge = eventBadgeFromCoder4Totals(totals);
 * const badges = await listPublicBadgesMany(ids, {
 *   attendanceLeaders: attendanceLeadersFromCoder4Feed(feed),
 * });
 *
 * // Until #15 is on this tree, loaders use consumeEventCheckinFeed
 * // (SELECT-only Coder 4 shape from event_checkins — never INSERT).
 * ```
 *
 * HTTP: `GET /api/badges/:alumniId` → `{ alumniId, badges: PublicBadge[] }`
 * Live attendance: `GET /api/events/attendance/feed` (+ `?alumId=` → `{ alum, feed }`)
 * Server loaders: `listPublicBadgesFromFeed` / `listPublicBadgesManyFromFeed` in `@/lib/badges-attendance`
 */
export { HoyaBadge, HoyaBadgeRow } from "@/components/hoya-badges";
export { VerifiedHoyaBadge } from "@/components/verified-hoya-badge";

export {
  BADGE_LABELS,
  BADGE_PERCENTILE_THRESHOLDS,
  BADGE_TYPES,
  assemblePublicBadges,
  badgeLabel,
  attachDonorLeaderBadges,
  computeDonorBadge,
  computeEventTopBadge,
  consumeEventCheckinFeed,
  donorBadgeForCohortKey,
  donorBadgeType,
  donorTierForAlumniId,
  eventSlugFromTitle,
  eventBadgeFromCoder4Row,
  eventBadgeFromCoder4Totals,
  eventTierFromCoder4Feed,
  eventTopBadgeType,
  hasUsableAttendanceRank,
  grantVerifiedHoya,
  grantVerifiedHoyaForAlumSession,
  isBadgeType,
  listPublicBadges,
  listPublicBadgesMany,
  percentileFromRank,
  publicBadgesJson,
  rankDonorTotals,
  tierFromPercentile,
  tierFromRank,
  toPublicBadge,
  type BadgeTier,
  type BadgeType,
  type PublicBadge,
} from "@/lib/badges";

export {
  EVENT_BADGE_FEED_VERSION,
  attendanceLeadersFromCoder4Feed,
  eventBadgeFeedFromCoder4Json,
  isAlumniUuid,
  normalizeAlumniId,
  resolveFeedAlumId,
  type Coder4AttendanceFeedResponse,
  type EventBadgeFeed,
  type EventBadgeFeedRow,
  type EventBadgeTotals,
  type EventCheckinFeedRow,
} from "@/lib/badge-event-feed";
