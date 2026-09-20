# Add admins (HoyaSaxa)

Admin, Board, and Alum are enforced in `src/proxy.ts` (Next.js request gate) and in the write APIs. UI hide is not enough.

## How a session becomes Admin / Board / Alum

1. **Admin** — `ga_session` staff cookie. Usernames come from the coach gate (`COACH_USERNAME`, default `Hoyas`) plus the Admin list. Seeded Admin usernames: **Lars**, **Sgarlata**, **Mike**, **Michael**, **Michael Kasten**. They can see/post everything, including From Sgarlata / Message from Head Coach.
2. **Board** — `hoya_alum_session` with `role=board` (preview username `Board`, or any name in `HOYA_BOARD_USERNAMES` that is **not** on the Admin list). They can see/post locker and portal content except Sgarlata / coach compose. Middleware returns **403** on those compose POSTs.
3. **Alum** — claim/login `hoya_alum_session` with `role=alum`. They can edit their own record (`/me`, `POST /api/alumni/update`), post Brothers on For You (`POST /api/locker/feed`), and search the directory. A successful claim or alumni login sets **Verified Hoya**.

Resolution order: env lists (`HOYA_ADMIN_USERNAMES` / `HOYA_OWNER_USERNAMES` / `HOYA_COACH_USERNAMES` / `HOYA_BOARD_USERNAMES` / `HOYA_ALUM_USERNAMES`) then `staff_roles` in Neon (username or email). Admin wins if a name is on both Admin and Board lists.

## Add an Admin

**Preferred (env, same pattern as coach):**

1. Vercel → Project → Settings → Environment Variables.
2. Set `HOYA_ADMIN_USERNAMES` to a comma-separated list (a **non-empty** value replaces the seed list). Always include people who should stay Admin.
   ```
   HOYA_ADMIN_USERNAMES=Lars,Sgarlata,Mike,Michael,Michael Kasten,NewAdmin
   ```
   `HOYA_OWNER_USERNAMES` is still honored and merged onto the Admin list. `COACH_USERNAME` is always Admin.
3. Redeploy so the new env is live. They sign in at `/login` (or `/home/login`) with the shared `COACH_PASSWORD`.

**Or (database):**

```sql
INSERT INTO staff_roles (username, role)
VALUES ('NewAdmin', 'owner')
ON CONFLICT DO NOTHING;
```

`role` may be `owner`, `admin` (treated as owner), `coach`, or `board`. Unique on `lower(username)`. The app seeds the five Admin names into `staff_roles` on first portal table ensure.

Do not put an Admin username only in `HOYA_BOARD_USERNAMES` — Admin precedence will still win if they are also on the Admin/owner list.

## Add a Board user (no Sgarlata compose)

Set `HOYA_BOARD_USERNAMES=Board,Pat` (names that are **not** Admins). They share `COACH_PASSWORD` unless `HOYA_BOARD_PASSWORD` is set. Compose paths stay blocked in proxy + `POST /api/messages/channels/sgarlata/posts` + `POST /api/portal/coach-messages`.
