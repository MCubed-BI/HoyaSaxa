# HoyaSaxa

Georgetown football alumni CRM (Hoya Football / Georgetown Alum).

Coach-facing CRM for Georgetown football alumni. Head Coach Sgarlata can search the directory, open a player card, and send in-app text or email blasts.

The app reads the existing Neon schema in project **Sgarlata** (`alumni`, `alumni_emails`, `alumni_phones`, `alumni_roster_years`). It does not create those tables.

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

3. Coach login is required before any alumni data is shown.

   | Variable | Local / demo default | Production |
   | --- | --- | --- |
   | `COACH_USERNAME` | `Hoyas` | Set a staff username |
   | `COACH_PASSWORD` | `Sgarlata35` | Set a strong shared password |

   Defaults are only for local and demo use. Set both variables on Vercel for production.

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
table; currently **2003–current**) and upserts into `alumni` / `alumni_roster_years`.

- Match key: `lower(last_name)|lower(first token of first_name)` (same as workbook import)
- New roster-only players get `source_flags.guhoyas_roster` and `guhoyas_years`
- Existing emails, phones, and LinkedIn URLs are never deleted
- Optional env: `GUHOYAS_ROSTER_YEARS_FROM` / `GUHOYAS_ROSTER_YEARS_TO` (defaults: earliest available–current year)

Library: `src/lib/guhoyas-roster.ts` (`fetchGuhoyasRosters`, `mergeRostersIntoAlumni`, `fetchAndMergeGuhoyasRosters`).

## Home / For You / Newsflash

Alumni-facing Home, For You feed, and Lars Newsflash. They use the existing CRM styles, do **not** replace the staff directory, and do not implement claim, athlete profiles, events CRUD, or giving.

| Path | Who | What |
| --- | --- | --- |
| `/home/login` | public | Sets `hoya_alum_session` with `role=board` or `role=alum` |
| `/home` | locker or staff session | Welcome hero, quick actions, upcoming event, recent activity |
| `/feed` | locker or staff session | Tabs: For You / Teammates / Alumni / Following |
| `/newsflash` | locker or staff session | Board publishes; alumni read |

### Locker demo session

| Username | Role | Cookie |
| --- | --- | --- |
| `Lars` | board (can publish Newsflash) | `hoya_alum_session` `role=board` |
| `Alum` | alumnus (read Home, For You, Newsflash) | `hoya_alum_session` `role=alum` |

Password defaults to `COACH_PASSWORD` (`Sgarlata35` locally) unless `HOYA_BOARD_PASSWORD` / `HOYA_ALUM_PASSWORD` / `HOYA_LOCKER_PASSWORD` is set.

Verify:

1. Open `/home/login`, sign in as `Lars` / `Sgarlata35`. Confirm Home hero, quick actions, upcoming event, and recent activity.
2. Open `/newsflash` as Lars and publish a headline. Confirm it appears for an `Alum` session after sign-out / sign-in.
3. Open `/feed`. For You shows official + alumni posts. Teammates and Following are stubs.

### Seed dependency

Main already has the Sgarlata `alumni` schema. Locker adds (on first connected page load or Newsflash publish):

- `newsflash_posts` — board notes; optional `event_at` drives the Home upcoming-event card
- `locker_feed_posts` — official + alumni MVP feed rows

If `DATABASE_URL` is missing, Home / For You / Newsflash still render demo content and Newsflash publishes stay in-process. With Neon connected, tables seed on first load. If an `events` table from the Events lane exists, Home prefers the next upcoming row; otherwise it uses a dated Newsflash or the demo card. Directory / Events / Giving quick actions only link those lanes.

Claim / register pages are owned by another lane and are not touched here.

## Pages

- `/login` — shared coach password gate
- `/home` — alumni Home (hero, quick actions, upcoming event, recent activity)
- `/` — searchable directory (cards on mobile, table on desktop)
- `/alumni/[id]` — full player card
- `/reports` — build a group, download CSV, jump to text or email blast
- `/blast` — one selected group, then compose and send a text or an email

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

### Email (Resend or SendGrid)

```
EMAIL_FROM=coach@yourdomain.com
RESEND_API_KEY=
# or
SENDGRID_API_KEY=
```

Set `EMAIL_FROM` plus one API key to send from the app. Prefer Resend. Without them, Prepare copies subject/body/recipients or opens a `mailto:` draft (small groups).

## Deploy

Deploy to Vercel. Set `DATABASE_URL`, `COACH_USERNAME`, and `COACH_PASSWORD`. Add Twilio and/or Resend (or SendGrid) when you are ready to send from the app. Auth stays on for every environment — unauthenticated visitors never see alumni data.
