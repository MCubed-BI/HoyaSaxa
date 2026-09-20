# Coders 1–5 — platform contracts

Foundational helpers for the Myspace / feed / badge stack. **Do not rebuild claim, staff CRM, or a full Myspace UI in this lane.** Import these modules and stack on them.

Live: https://georgetown-alum.vercel.app  
Cookies stay `ga_session` (staff) and `hoya_alum_session` (alum / board). Extend; do not replace.

**Product display name (locked):** Georgetown Football Alum Network. Import `PRODUCT_DISPLAY_NAME` from `@/lib/product` in chrome / metadata. Do not invent aliases; apply the rename in chrome PRs, not here.

## Shared imports

```ts
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";
import { resolvePlatformRole, canEditAlumniRecord, SEED_ADMIN_ALUMNI_ID } from "@/lib/platform-roles";
import { readPlatformRole } from "@/lib/platform-session";
import { canonicalizeFeedSection, canPostToFeedSection } from "@/lib/feed-sections";
import { listPublicBadges, grantVerifiedHoya } from "@/lib/badges";
import { updateAlumniPhotos } from "@/lib/alumni-photos";
```

`GET /api/session` now also returns `{ platformRole, admin, canPostBrothers, canPostBoard, canPostSgarlata, canCreateEvents }` next to `{ role, roles, alum, coach }`.

Viewer (`getCurrentViewer`) has `platformRole`. Locker viewer has `canPostNewsflash` / `canPostBrothers` / `canPostSgarlata`.

---

## Coder 1 — Roles, middleware, session, chrome

**Contract:** platform roles `admin` | `board` | `alum`. Suite titles / chrome: `PRODUCT_DISPLAY_NAME` (`Georgetown Football Alum Network`).

| Platform role | Who | Can do |
| --- | --- | --- |
| `admin` | Staff `ga_session`; `ADMIN_EMAILS`; `staff_roles.role=admin`; seeds below | See / post every For You section (`brothers`, `board`, `sgarlata`); edit any profile photos |
| `board` | Cookie `role=board` or Admin toggle → `staff_roles.role=board` | Alum capabilities + Message from the Board. No Sgarlata compose |
| `alum` | Claim / login `hoya_alum_session` `role=alum` | Full Alum Mode: For You Brothers, Directory, /me photos, Verified Hoya; can post events |

**Seeds (admin):**

- Lars — Admin (staff `ga_session` / seed username)
- Sgarlata / `Hoyas` — coach session
- Michael Kasten / Mike — alum id `c8fc1d9c-d5a7-445d-8e59-b2bddd53d136`

Board preview username is `Board`. **Board cannot compose Sgarlata.**

**Env:** `ADMIN_EMAILS=lars@example.com,mike@example.com` and `HOYA_ADMIN_USERNAMES` (replaces the username seed list when set).  
**DB:** `staff_roles` (seeded owner for Lars / Sgarlata / Mike / Michael / Michael Kasten / Hoyas). Add-admin runbook: [admin-roles.md](admin-roles.md).

Staff tools (Data Sync, Twilio blast, reports) still require `ga_session`. Platform admin on an alum cookie does **not** unlock `/sync`.

Admin grants Board from `/admin` or an athlete profile (`POST /api/admin/board`). Persist on `staff_roles.alumni_id`. See [admin-roles.md](admin-roles.md).

Events (not For You sections): Admin / Board / Alum can post. `/events` is filterable via existing Upcoming / Past / My Events tabs. Richer type/search filters stay with the events UI lane.

`src/proxy.ts` still uses the existing cookie gates. New paths `/board`, `/brothers`, `/api/feed`, `/api/badges` are alum-allowlisted.

---

## Coder 2 — Feed sections

Canonical keys: **`brothers` | `board` | `sgarlata`**.

| Alias | Becomes |
| --- | --- |
| `newsflash`, `news`, `/newsflash` | `board` / `/board` |
| `brother`, `alumni` | `brothers` |
| `from-sgarlata`, `/sgarlata` | `sgarlata` → `/messages/sgarlata` |

**Post rules** (`canPostToFeedSection`):

- `brothers` — alum, board, admin
- `board` — board, admin (legacy `POST /api/locker/newsflash` and `/api/portal/newsflash`)
- `sgarlata` — admin only

**APIs**

- `GET /api/feed/posts?section=brothers|board|sgarlata`
- `POST /api/feed/posts` `{ section, title, body }` — 403 if the platform role cannot post there

`locker_feed_posts.section` is additive. `newsflash_posts` still store Board notes.

Do not rebuild these keys. Coder 2 For You (`/feed`) stacks Myspace UI on them:

- Shell `for-you`, identity `for-you__identity`, sections `for-you__brothers` / `for-you__board` / `for-you__sgarlata`
- Cards `for-you-card`
- Headings **From Your Brothers** / **From Your Board** / **From Sgarlata**
- Posts via `GET`/`POST /api/feed/posts` (`section` must be `brothers` \| `board` \| `sgarlata`)
- Compose ACL is `canPostToFeedSection` (not coach-only): claimed `hoya_alum_session` `role=alum` posts **Brothers** only; board also posts **Board**; Sgarlata stays admin
- `/newsflash` → `/board` (do not retarget)

---

## Coder 3 — Badges + giving

Types: `verified_hoya`, `donor_platinum|gold|silver|bronze`, `event_top_*` (same percentiles).

| Tier | Band | Percentile |
| --- | --- | ---: |
| platinum | Top 1% | ≥ 99 |
| gold | Top 10% | ≥ 90 |
| silver | Top 25% | ≥ 75 |
| bronze | Top 50% | ≥ 50 |

**Never expose donor `$` / `amount_cents` in badge UI, profile, or `/api/badges`.** Use `PublicBadge` / `HoyaBadge` / `HoyaBadgeRow`. Do not add a second chip component.

- Verified Hoya is granted on claim / alumni login (`grantVerifiedHoya`). Directory/profile also treat `alumni_claims` as verified.
- Donor rank reads `fundraising_pledges.alumni_id` (and `giving_pledges.alumni_id` if that column exists). Totals stay server-side.
- **Event bands consume Coder 4 only** — they persist `event_checkins` and compute lifetime `attendanceCount` + `rank` / `percentile`. Coder 3 maps those to `event_top_*`. No dual-write.

**Surfaces:** `/directory` cards + table, `/athletes/[id]`, `/me`, staff `/` cards, `/alumni/[id]`.

**Badge component API** (`@/lib/badge-api`)

```ts
import { HoyaBadge, HoyaBadgeRow } from "@/components/hoya-badges";
import {
  listPublicBadges,
  listPublicBadgesMany,
  eventBadgeFromCoder4Totals,
  attendanceLeadersFromCoder4Feed,
  type EventBadgeFeedRow,
  type EventBadgeTotals,
} from "@/lib/badge-api";

<HoyaBadge badge={badge} />            // PublicBadge | BadgeType
<HoyaBadgeRow badges={badges} />

const totals = await getAlumAttendanceTotals(alumId); // Coder 4
const eventBadge = eventBadgeFromCoder4Totals(totals);
const badgesById = await listPublicBadgesMany(ids, {
  attendanceLeaders: attendanceLeadersFromCoder4Feed(feed),
});
```

Coder 4 feed contract (consume-only): `eventId`, `eventSlug?`, `eventTitle?`, `alumId` / `userId`, `checkedInAt`, `attendanceCount`, `rank`, `percentile` (`cohortSize` optional). `GET /api/events/attendance/feed` and `?alumId=` → `{ alum, feed }` parse via `eventBadgeFeedFromCoder4Json`.

- One person: `listPublicBadges(alumniId, { attendanceTotals })` or `GET /api/badges/:alumniId` → `{ alumniId, badges: PublicBadge[] }`
- Directory: `listPublicBadgesMany(ids, { verifiedAlumniIds, attendanceLeaders })`
- Profile + directory load `listPublicBadgesManyFromFeed` / `listPublicBadgesFromFeed` (`@/lib/badges-attendance`) — same payload as **`GET /api/events/attendance/feed`** and **`?alumId=`**. Consume only; never INSERT `event_checkins`.

---

## Coder 4 — Photos + check-in ranks

**Photos** — additive Neon columns on `alumni` (not NTE): `football_photo_url`, `linkedin_photo_url`. Edit only claimed self or admin.

- `POST /api/alum/photos` `{ alumniId, football_photo_url, linkedin_photo_url }`
- `GET /api/alum/photos?alumniId=`
- Claimed-self `POST /api/alumni/update` also accepts those keys on `patch`

Ensure: `ensureAlumniPhotoColumns()`. Helpers: `src/lib/alumni-photos.ts` (`preferredAlumniPhotoUrl` prefers football, then a stored LinkedIn URL — no LinkedIn scrape).

Public GUHoyas football headshots are farmed into `football_photo_url` on Data Sync apply (`src/lib/guhoyas-roster.ts`). Re-run: apply a Data Sync batch, or `npm run farm-photos`.

**Check-in + ranks (PR #15)** — Coder 4 owns `event_checkins` persistence and lifetime ranks. Coder 3 consumes `eventId`, `alumId` / `userId`, `checkedInAt`, `attendanceCount`, `rank` / `percentile` for event badge bands only. **No dual-write.** RSVP is not attendance.

```ts
import { listEventCheckinFeed, getAlumAttendanceTotals } from "@/lib/event-attendance-feed";
import { eventBadgeFromCoder4Totals, listPublicBadgesMany } from "@/lib/badge-api";
```

---

## Verify

```bash
npm test
npm run build
```

Local: sign in as `Lars` / `Sgarlata35` on `/home/login` (seed admin + board cookie). `Alum` stays platform `alum`. Staff `Hoyas` is admin via `ga_session`.
