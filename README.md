# HoyaSaxa

Georgetown Football Alum Network — Georgetown football alumni CRM (repo stays HoyaSaxa).

Coach-facing CRM for Georgetown football alumni, plus an alumnus portal for claimed players. Head Coach Sgarlata can search the directory, open a player card, and send in-app text or email blasts. Claimed alumni see a separate alum shell.

The app reads the existing Neon schema in project **Sgarlata** (`alumni`, `alumni_emails`, `alumni_phones`, `alumni_roster_years`). It does not create those tables.

Additive portal tables (created if missing): `staff_roles`, `coach_messages`, `newsflash_posts`, `fundraising_campaigns`, `fundraising_pledges`. Claim tables stay on the Register/Claim branch.

## Stack

- Next.js App Router, TypeScript, Tailwind, shadcn/ui
- `@neondatabase/serverless` + Drizzle schema types
- Optional workbook import via `scripts/import-alumni.ts`

## Setup

1. Copy environment defaults:

   ```bash
   cp .env.example .env.local
   ```

2. Set `DATABASE_URL` to the Neon pooled connection string. Do not commit it.

3. Alum or Admin login is required before any alumni data is shown.

   | Variable | Local / demo default | Production |
   | --- | --- | --- |
   | `COACH_USERNAME` | `Hoyas` | Set a staff username |
   | `COACH_PASSWORD` | `Sgarlata35` | Set a strong shared password |

   Defaults are only for local and demo use. Set both variables on Vercel for production.

## Platform contracts (Coders 1–5)

Stacking surface for Myspace / feed / badges. Details: [`docs/CODERS.md`](docs/CODERS.md).

| Layer | Keys | Notes |
| --- | --- | --- |
| Cookie roles (unchanged) | `owner` `coach` `alum` `board` | `ga_session` / `hoya_alum_session` |
| Platform roles | `admin` `board` `alum` | `src/lib/platform-roles.ts` |
| Feed sections | `brothers` `board` `sgarlata` | `newsflash` → `board` (`/newsflash` → `/board`) |
| Badges | `verified_hoya`, `donor_*`, `event_top_*` | Never show donor `$` |
| Photos | `football_photo_url`, `linkedin_photo_url` | Claimed self or admin; `POST /api/alum/photos` |

Admin resolution: `ADMIN_EMAILS`, `staff_roles`, coach `ga_session`, plus seeds Lars (board), Sgarlata / Hoyas (coach), Michael Kasten / Mike (`c8fc1d9c-d5a7-445d-8e59-b2bddd53d136`). Claim / login grants Verified Hoya.

## Roles

Three product modes, enforced in `src/proxy.ts` and write APIs (not UI-only). Cookie roles stay `owner` / `coach` / `board` / `alum`; platform **admin** is an overlay (`owner`/`coach`, `ADMIN_EMAILS`, `staff_roles`, and seeded Lars / Sgarlata / Mike).

| Mode | How it is assigned | What they can do |
| --- | --- | --- |
| **Admin** | Admin login `ga_session`. `COACH_USERNAME` (default `Hoyas`) plus `HOYA_ADMIN_USERNAMES` / `HOYA_OWNER_USERNAMES` / `staff_roles`. Seed: **Lars**, **Sgarlata**, **Mike**, **Michael**, **Michael Kasten** | See/post all For You sections, including From Sgarlata |
| **Board** | Cookie `role=board`, `HOYA_BOARD_USERNAMES`, or Admin **Board member** toggle (`staff_roles`) | Alum capabilities + Message from the Board. No Sgarlata compose |
| **Alum** | Claim/login `hoya_alum_session` `role=alum`, or preview `Alum` | Full Alum Mode: Brothers on For You, Directory, /me photos, events. **Verified Hoya** after a successful claim/login |

Add Admins with `HOYA_ADMIN_USERNAMES` or `INSERT INTO staff_roles` — short runbook: [docs/admin-roles.md](docs/admin-roles.md).

### Alum session contract

Football Program owns Register myself / claim on `cursor/hoya-register-claim-*`. Import `src/lib/alum-session.ts` after a successful claim/login and call `setAlumSessionCookies(response, { role, alumniId, email, name })`. Do not reuse `ga_session`. This repo does not rebuild claim UI.

| Field | Value |
| --- | --- |
| Cookie | `hoya_alum_session` (`alumSessionCookieName`) |
| Flags | httpOnly, Secure in production, SameSite=Lax, path `/` |
| Payload | HMAC-signed `base64url(JSON).signature` |
| JSON | `{ v: 1, role: "alum" \| "board", alumniId, email, name, exp }` |

Helpers: `readAlumSession(req)`, `alumSessionCookieName`, `AlumSession`, `requireAlumRole(...roles)`, `setAlumSessionCookies`, `GET /api/alum/session`.

`ga_alumni_session` is still accepted as a fallback hook until claim switches over. Home/Newsflash preview login may write a locker-shaped token (`{ role, label, iat }` via `hoya-alum-session.ts`) on the same cookie name — portal proxy and viewers accept both. Alum cookies never unlock `/sync`, staff `/blast`, Twilio, or `/reports`.

**Email blast**

| Who | Where | What they can send |
| --- | --- | --- |
| owner / coach (`ga_session`) | `/blast` | Unlimited filter groups and/or checked alumni; text (Twilio) or email |
| alum / board (`hoya_alum_session` or claim session) | `/portal/blast` and directory picks on `/directory` | Email only, and only to alumni they selected. No filter-wide blast, no Twilio, no Data Sync |

Alum send uses the same `sendProviderEmail` path as staff. Live delivery is Gmail SMTP (`GMAIL_USER` + `GMAIL_APP_PASSWORD` via nodemailer). From is that mailbox. Without those, Prepare opens a Gmail compose window or a `mailto:` draft. `POST /api/blast/send` rejects alum SMS, `includeFilters`, and empty pick lists. `/api/blast/ids` (add filtered group) stays staff-only.

Local preview: `/login` as `Alum` or `Board` with the coach password mints `hoya_alum_session` and opens `/portal`. `/login` as `Lars`, `Sgarlata`, `Mike`, or `Hoyas` is Admin (`ga_session`).

4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   Dev server: [http://127.0.0.1:43173](http://127.0.0.1:43173)

## Import alumni

The Excel workbook is source data, not part of the repo (it contains personal contact information).

```bash
npm run import -- --file path/to/georgetown-alumni.xlsx
```

If you drop the file at `uploads/georgetown-alumni_5545.xlsx`, that path is the default.

The script merges these sheets when present:

- **All Time** — name, seasons, position, hometown
- **Football** — preferred name, class/grad year, email
- **Georgetown LinkedIn** — company, title, industry, current city/state, LinkedIn, email
- **sgarlata contacts** — extra emails, phones, address
- **2011 to 2025 Rosters GU** — season-year / position / class rows

Rows upsert by LinkedIn URL, then primary email, then first + last name. Re-running the script updates existing records and fills missing fields.


## GUHoyas roster sync

Every successful **Data Sync → Apply** also re-fetches public football rosters from
[guhoyas.com](https://guhoyas.com/sports/football/roster) (years with a real archived
table; currently **2003–current**) and upserts into `alumni` / `alumni_roster_years`,
then farms player headshots into `alumni.football_photo_url`.

- Match key: `lower(last_name)|lower(first token of first_name)` (same as workbook import)
- New roster-only players get `source_flags.guhoyas_roster` and `guhoyas_years`
- Headshots: fill empty `football_photo_url`; replace an existing GUHoyas URL only when the source path date is newer. Custom / claimed URLs are left alone.
- `linkedin_photo_url` is never written by this scrape (no LinkedIn farming)
- Existing emails, phones, and LinkedIn URLs are never deleted
- Optional env: `GUHOYAS_ROSTER_YEARS_FROM` / `GUHOYAS_ROSTER_YEARS_TO` (defaults: earliest available–current year)
- Fetches are sequential with a ~350–400ms delay between years

Library: `src/lib/guhoyas-roster.ts` (`fetchGuhoyasRosters`, `mergeRostersIntoAlumni`, `mergeFootballPhotosIntoAlumni`, `fetchAndMergeGuhoyasRosters`).

### Re-run football headshots

1. **Preferred:** Data Sync → upload any workbook (or re-apply a staged batch) → **Apply to live alumni**. After the workbook merge finishes, the apply path re-fetches GUHoyas years and writes a `guhoyas: … photos filled / updated / matched` note on the batch preview.
2. **Photos only** (no roster upsert):

   ```bash
   npm run farm-photos
   npm run farm-photos -- --from 2024 --to 2026
   ```

   Requires `DATABASE_URL`. Prints JSON match / fill / update counts. Does not scrape LinkedIn.

## Home / For You / Board

Alumni-facing Home, For You feed, and Board (legacy Newsflash). They use the existing CRM styles, do **not** replace the staff directory, and do not implement claim, athlete profiles, events CRUD, or giving.

| Path | Who | What |
| --- | --- | --- |
| `/home/login` | public | Sets `hoya_alum_session` with `role=board` or `role=alum` |
| `/home` | locker or staff session | Welcome hero, quick actions, upcoming event, recent activity |
| `/feed` | locker or staff session | Myspace For You: identity strip + stacked `brothers` / `board` / `sgarlata` |
| `/board` | locker or staff session | Board publishes; alumni read. `/newsflash` redirects here |

### Locker demo session

| Username | Role | Cookie |
| --- | --- | --- |
| `Lars` / `Sgarlata` / `Mike` | Admin (see/post all, including From Sgarlata) | `ga_session` at `/home/login` |
| `Board` | Board Mode (no Sgarlata compose) | `hoya_alum_session` `role=board` |
| `Alum` | alumnus (edit self, Brothers, directory; Verified Hoya on claim) | `hoya_alum_session` `role=alum` |

Password defaults to `COACH_PASSWORD` (`Sgarlata35` locally) unless `HOYA_BOARD_PASSWORD` / `HOYA_ALUM_PASSWORD` / `HOYA_LOCKER_PASSWORD` is set.

Verify:

1. Open `/home/login`, sign in as `Lars` / `Sgarlata35` (Admin). Confirm Home hero, quick actions, upcoming event, and recent activity.
2. Open `/board` as Admin or `Board` and publish a headline. Confirm it appears for an `Alum` session after sign-out / sign-in. `/newsflash` redirects to `/board`.
3. Open `/feed`. For You shows pic + name + class year + locker link, then chips All / Your Brothers / Board / From Your Headcoach. Alum can compose a Brothers post. `/newsflash` still redirects to `/board`.

### Seed dependency

Main already has the Sgarlata `alumni` schema. Locker adds (on first connected page load or Newsflash publish):

- `newsflash_posts` — board notes; optional `event_at` drives the Home upcoming-event card
- `locker_feed_posts` — official + alumni MVP feed rows

If `DATABASE_URL` is missing, Home / For You / Newsflash still render demo content and Newsflash publishes stay in-process. With Neon connected, tables seed on first load. Feed and Home activity dedupe Newsflash rows that were also copied into `locker_feed_posts` (same title + body), so seed posts appear once. If an `events` table from the Events lane exists, Home prefers the next upcoming row; otherwise it uses a dated Newsflash or the demo card. Directory / Events / Giving quick actions only link those lanes.

Claim / register pages are owned by another lane and are not touched here.

## Pages

Alum chrome uses existing CRM styles (function over polish). Primary nav is **Home · Directory · Events · Giving · Messages**.

- `/login` — Admin login (`ga_session` for owner/coach; alum preview usernames mint `hoya_alum_session`)
- `/register` — alumni claim (last name + graduating class)
- `/alumni-login` — alumni email/password login
- `/me` — edit claimed records or merge a duplicate. **Not me** on Merge accounts permanently hides that pair for the claimed login (`alumni_duplicate_dismissals`).
- `/portal` — alum entry; redirects to `/home`
- `/home` — Welcome hero, Directory/Events/News/Giving, upcoming event, recent activity
- `/feed` — For You (Myspace identity rail + Brothers / Board / Sgarlata). Keys stay `brothers` | `board` | `sgarlata`
- `/board` — Board section (admin + board publish, alumni read). `/newsflash` redirects here
- `/events` — Upcoming / Past / My Events, plus search and category filters
- `/events/new` — Create Event (Admin, Board, or Alum)
- `/messages` — inbox; `/messages/sgarlata` is the pinned official channel
- `/directory` — Hoya Directory (search + All/Athletes/Alumni/Coaches/Staff). Requires `ga_session`, `hoya_alum_session`, or the claim session. Anonymous visitors are sent to `/login`. Emails stay hidden on these cards.
- `/athletes/[id]` — public athlete profile (Overview/Years Active/Photos/Career/Q&A). Likely-duplicate panel: Merge duplicate is unchanged; **Not me** permanently hides that pair for the viewing claimed alum (`account:{id}`) or staff admin (`admin:{username}`). The other scope can still see it.
- `/portal/directory` / `/portal/profile` — aliases to `/directory`
- `/portal/events` / `/portal/giving` — aliases to `/events` and `/giving`
- `/portal/feed` / `/portal/messages` / `/portal/newsflash` — aliases (`/portal/newsflash` → `/board`)
- `/alum` — redirects to `/portal`
- `/find-my-alum` — alumni location map + heat (current city/state, hometown, or parsed US address). Staff nav link; alum More link. Defaults to US centroids; optional `GEOCODE_PROVIDER=nominatim|hybrid`.
- `/locker` — messages access-code preview
- `/home/login` — locker preview login
- `/` — searchable staff directory (cards on mobile, table on desktop)
- `/alumni/[id]` — full staff player card
- `/fundraising` — staff campaigns
- `/reports` — build a group, download CSV, jump to text or email blast
- `/blast` — one selected group, then compose and send a text or an email
- `/giving` — fundraising MVP: $25 / $50 / $100 / $250 / Other, Give Now, Impact / Funds / Leaderboards tabs. Pledges are unpaid intents in Neon (`giving_pledges`). Stripe is later.

Alumni login is a distinct **alum** session, not coach. Portal detect:

```ts
import { isAlumLoggedIn, getAlumSession } from "@/lib/alum-session";
const alum = isAlumLoggedIn(await cookies()); // cookie `hoya_alum_session`, role `"alum"`
```

Cookie `hoya_alum_session` is httpOnly, Secure in production, SameSite=Lax. Value is HMAC-signed JSON `{ v:1, role:"alum"|"board", alumniId, email, name, exp }`. Register myself always sets `role: "alum"`. Do not use `ga_session` / `isCoachLoggedIn` for alum — that cookie never unlocks Data Sync or owner blast. Optional: readable `ga_role=alum` hint, or `GET /api/session` `{ role, roles, alum, coach }`. Claiming a roster row never unlocks reports, staff `/blast`, or sync pages. `/directory` is available to a valid staff, alum, or claim session.

Sign out from Home, For You, or Newsflash posts to `/api/logout` with `from=/newsflash` (or `/home` / `/feed`). That always clears `hoya_alum_session`, `ga_alumni_session`, `ga_session`, and `ga_role` using the same cookie flags they were set with, then returns to `/home/login` — it does not bounce to coach `/login` while leaving the alum session.

The app uses existing Neon tables `alumni_accounts`, `alumni_claims`, and `alumni_record_merges` when present, and creates them if they are missing.

## Events

`+ Create Event` and `POST /api/events` allow platform **admin**, **board**, and **alum** (Coder 5 `canPostEvents` / `canCreateProgramEvents` / `resolvePlatformRole`). Events are not For You sections — posting an event is not Sgarlata compose.

- Shared staff login (`COACH_USERNAME`, default `Hoyas`) is platform **admin** via `ga_session` and can create.
- Locker `hoya_alum_session` with role **board** (or an Admin Board grant) can create.
- Claimed / locker **alum** can create on the same `/events/new` path. Unauthenticated users cannot. `/events/new` redirects to `/events?error=forbidden`.
- The list filters by upcoming / past / mine, search (`q`), and category.
- My Events is the current viewer’s created rows plus **Add to My Events**.
- Home’s upcoming-event card reads the next `events.starts_at` row when this table exists.

This lane does not change Register myself / claim or the portal shell.

## Messages

Staff (existing `ga_session` coach gate) can post to **Message from Sgarlata**. Alumni with `hoya_alum_session` (or the Register/Claim `ga_alumni_session` cookie) can read Messages only — Data Sync and other owner tools stay locked.

Tables (`message_channels`, `message_posts`, `message_reads`) are created on first use, same pattern as blast tables. The official Sgarlata channel is seeded pinned.

### Demo

1. Staff: open `/login`, sign in as `Hoyas` / `Sgarlata35`, go to **Messages**, open **Message from Sgarlata**, post a note.
2. Alum: sign out, open `/locker`, enter access code `HoyaSaxa` (local default). That sets `hoya_alum_session`. Read Messages and the Sgarlata channel — no compose box. Visiting `/sync` redirects back to Messages.

Filters are multi-select: state, city, position, class/grad year, season year, plus has email / phone / LinkedIn. Check alumni on the directory to add a manual blast list. That same list feeds both channels.

## Blasts

`/blast` and `POST /api/blast/send` handle both channels. Sends are stored in `text_blasts` / `email_blasts` (and their recipient tables).

### Text (Twilio)

```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

Without these, Prepare still copies numbers or opens Messages (`sms:`).

### Email (Gmail SMTP)

```
GMAIL_USER=coach@yourdomain.com
GMAIL_APP_PASSWORD=
```

Staff `/blast` and alum `/portal/blast` both call `sendProviderEmail`. When `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set, nodemailer sends through Gmail SMTP and From is that mailbox. Without them, Prepare copies subject/body/recipients or opens a Gmail / `mailto:` draft.

## Deploy

Deploy to Vercel. Set `DATABASE_URL`, `COACH_USERNAME`, and `COACH_PASSWORD`. Optionally set `HOYA_ADMIN_USERNAMES` (replaces the Admin seed when set), `HOYA_OWNER_USERNAMES`, `HOYA_COACH_USERNAMES`, `HOYA_BOARD_USERNAMES`, `HOYA_ALUM_USERNAMES`, and `ALUMNI_SESSION_SECRET`. Add Admins via env or `staff_roles` — [docs/admin-roles.md](docs/admin-roles.md). Add Twilio and/or `GMAIL_USER` + `GMAIL_APP_PASSWORD` when you are ready to send from the app. Auth stays on for every environment — unauthenticated visitors never see alumni data.
