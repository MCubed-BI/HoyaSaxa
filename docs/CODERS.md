# Coders 1–5 — platform contracts

Foundational helpers for the Myspace / feed / badge stack. **Do not rebuild claim, staff CRM, or a full Myspace UI in this lane.** Import these modules and stack on them.

Live: https://georgetown-alum.vercel.app  
Cookies stay `ga_session` (staff) and `hoya_alum_session` (alum / board). Extend; do not replace.

## Shared imports

```ts
import { resolvePlatformRole, canEditAlumniRecord, SEED_ADMIN_ALUMNI_ID } from "@/lib/platform-roles";
import { readPlatformRole } from "@/lib/platform-session";
import { canonicalizeFeedSection, canPostToFeedSection } from "@/lib/feed-sections";
import { listPublicBadges, grantVerifiedHoya } from "@/lib/badges";
import { updateAlumniPhotos } from "@/lib/alumni-photos";
```

`GET /api/session` now also returns `{ platformRole, admin }` next to `{ role, roles, alum, coach }`.

Viewer (`getCurrentViewer`) has `platformRole`. Locker viewer has `canPostNewsflash` / `canPostBrothers` / `canPostSgarlata`.

---

## Coder 1 — Roles, middleware, session, chrome

**Contract:** platform roles `admin` | `board` | `alum`.

| Platform role | Who | Can do |
| --- | --- | --- |
| `admin` | Coach `ga_session`; `ADMIN_EMAILS`; `staff_roles.role=admin`; seeds below | See / post every feed section; edit any profile photos |
| `board` | `hoya_alum_session` `role=board` (unless seeded admin) | Everything except compose to From Sgarlata / coach message board |
| `alum` | Claim / login `hoya_alum_session` `role=alum` | Edit self, post Brothers, directory search; Verified Hoya on claim/login |

**Seeds (admin):**

- Lars — Admin (staff `ga_session` / seed username)
- Sgarlata / `Hoyas` — coach session
- Michael Kasten / Mike — alum id `c8fc1d9c-d5a7-445d-8e59-b2bddd53d136`

Board preview username is `Board`. **Board cannot compose Sgarlata.**

**Env:** `ADMIN_EMAILS=lars@example.com,mike@example.com` and `HOYA_ADMIN_USERNAMES` (replaces the username seed list when set).  
**DB:** `staff_roles` (seeded owner for Lars / Sgarlata / Mike / Michael / Michael Kasten / Hoyas). Add-admin runbook: [admin-roles.md](admin-roles.md).

Staff tools (Data Sync, Twilio blast, reports) still require `ga_session`. Platform admin on an alum cookie does **not** unlock `/sync`.

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

Do not build the full Myspace composer here — wire the section enum and enforcement.

---

## Coder 3 — Badges + giving

Types: `verified_hoya`, `donor_platinum|gold|silver|bronze`, `event_top_*` (same percentiles).

| Tier | Percentile |
| --- | ---: |
| platinum | ≥ 99 |
| gold | ≥ 90 |
| silver | ≥ 75 |
| bronze | ≥ 50 |

**Never expose donor `$` / `amount_cents` in badge UI or `/api/badges`.** Use `PublicBadge` / `HoyaBadge` / `HoyaBadgeRow`.

- Verified Hoya is granted on claim / alumni login (`grantVerifiedHoya`).
- Donor rank reads `fundraising_pledges.alumni_id` (and `giving_pledges.alumni_id` if that column exists).
- Event rank reads `event_checkins` once Coder 5 writes rows; until then the helper returns no event badge.

`GET /api/badges/:alumniId` → `{ alumniId, badges: PublicBadge[] }`.

---

## Coder 4 — Athlete photos + profile edit

Additive Neon columns on `alumni` (not NTE):

- `football_photo_url`
- `linkedin_photo_url`

**Edit only claimed self or admin.**

- `POST /api/alum/photos` `{ alumniId, football_photo_url, linkedin_photo_url }`
- `GET /api/alum/photos?alumniId=`
- Claimed-self `POST /api/alumni/update` also accepts those keys on `patch`

Ensure: `ensureAlumniPhotoColumns()`. Helpers: `src/lib/alumni-photos.ts`.

---

## Coder 5 — Events check-in (later)

`event_checkins (event_id, alumni_id, attendee_key, checked_in_at)` is created with event tables.

Do **not** ship a full check-in UI in the contracts PR. When attendance exists, `computeEventTopBadge` uses the same percentile tiers as donors.

RSVP (`event_rsvps`) is not attendance.

---

## Verify

```bash
npm test
npm run build
```

Local: sign in as `Lars` / `Sgarlata35` on `/home/login` (seed admin + board cookie). `Alum` stays platform `alum`. Staff `Hoyas` is admin via `ga_session`.
