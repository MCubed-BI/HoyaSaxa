# HoyaSaxa

Georgetown football alumni CRM (Hoya Football / Georgetown Alum).

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

3. Coach login is required before any alumni data is shown.

   | Variable | Local / demo default | Production |
   | --- | --- | --- |
   | `COACH_USERNAME` | `Hoyas` | Set a staff username |
   | `COACH_PASSWORD` | `Sgarlata35` | Set a strong shared password |

   Defaults are only for local and demo use. Set both variables on Vercel for production.

## Roles

Four roles: **owner**, **coach**, **alum**, and **board** (Lars).

| Role | How it is assigned | What they see |
| --- | --- | --- |
| `owner` | `COACH_USERNAME` (default `Hoyas`) and `HOYA_OWNER_USERNAMES` → `ga_session` | Full staff shell: directory, blast, sync, reports, coach messages, newsflash, fundraising |
| `coach` | `HOYA_COACH_USERNAMES` → `ga_session` | Same owner tools (blast stays on) |
| `board` | `HOYA_BOARD_USERNAMES` (default `Lars`) → `hoya_alum_session` | Legacy Locker + Newsflash write. Never unlocks Data Sync or coach blast. |
| `alum` | `hoya_alum_session` from Register/Claim, or preview username `Alum` | Legacy Locker only |

### Alum session contract

Football Program (Register/Claim) should import `src/lib/alum-session.ts` and set this cookie — do not reuse `ga_session`.

| Field | Value |
| --- | --- |
| Cookie | `hoya_alum_session` (`alumSessionCookieName`) |
| Flags | httpOnly, Secure in production, SameSite=Lax, path `/` |
| Payload | HMAC-signed `base64url(JSON).signature` |
| JSON | `{ v: 1, role: "alum" \| "board", alumniId, email, name, exp }` |

Helpers: `readAlumSession(req)`, `createAlumSessionToken`, `requireAlumRole(...roles)`, `GET /api/alum/session`.

`ga_alumni_session` is still accepted as a fallback hook until claim switches over. Alum cookies never unlock `/sync`, `/blast`, or `/reports`.

**Email blast:** coach/owner blast is unchanged. Alum blast is hidden until claim auth is real.

Local preview: `/login` as `Alum` or `Lars` with the coach password mints `hoya_alum_session` and opens `/portal`.

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

## Pages

- `/login` — staff gate (`ga_session` for owner/coach; `Alum`/`Lars` mint `hoya_alum_session`)
- `/alumni-login` — hook for claimed alumni sessions (`POST /api/alumni/login` from Register/Claim)
- `/register` — hook; Football Program owns the claim flow
- `/` — owner/coach directory
- `/portal` — Legacy Locker home (Coder 5 feed can extend `/portal/feed`)
- `/portal/directory` — alum directory cards (Coder 1 profiles)
- `/portal/events` — stub for Coder 2
- `/portal/giving` — fundraising MVP (Coder 3)
- `/portal/messages` — Sgarlata + newsflash (Coder 4 threads)
- `/portal/newsflash` — board posts
- `/alum` — redirects to `/portal`
- `/find-my-alum` — location groups; map slot if Find My Alum is already present
- `/message` — staff compose for Coach Sgarlata (`coach_messages`)
- `/newsflash` — staff/board news (`newsflash_posts`)
- `/fundraising` — staff campaigns
- `/me` — hook for the claim editor; shows linked `alumni_id` when a claim exists
- `/alumni/[id]` — full player card (staff only)
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

Deploy to Vercel. Set `DATABASE_URL`, `COACH_USERNAME`, and `COACH_PASSWORD`. Optionally set `HOYA_OWNER_USERNAMES`, `HOYA_COACH_USERNAMES`, `HOYA_BOARD_USERNAMES`, `HOYA_ALUM_USERNAMES`, and `ALUMNI_SESSION_SECRET`. Add Twilio and/or Resend (or SendGrid) when you are ready to send from the app. Auth stays on for every environment — unauthenticated visitors never see alumni data.
