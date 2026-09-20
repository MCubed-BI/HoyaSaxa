import { getSql } from "@/lib/db";
import { ensurePortalTables } from "@/lib/portal-schema";
import { normalizeStaffRole, type Role } from "@/lib/roles";
import type { AlumniListItem } from "@/lib/types";

export type CoachMessage = {
  id: string;
  title: string | null;
  body: string;
  author_role: string | null;
  author_label: string | null;
  created_at: string;
};

export type NewsflashPost = {
  id: string;
  title: string;
  body: string;
  event_at: string | null;
  author_label: string | null;
  created_at: string;
};

export type FundraisingCampaign = {
  id: string;
  title: string;
  description: string | null;
  goal_cents: number | null;
  donate_url: string | null;
  is_active: boolean;
  created_at: string;
  pledge_count: number;
  pledged_cents: number;
};

export type LocationGroup = {
  current_state: string;
  current_city: string | null;
  alumni_count: number;
};

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export async function lookupStaffRole(
  username: string,
  email?: string | null,
): Promise<Role | "admin" | null> {
  await ensurePortalTables();
  const rows = await query<Array<{ role: string }>>(
    `
    SELECT role
    FROM staff_roles
    WHERE ($1 <> '' AND lower(username) = lower($1))
       OR ($2 <> '' AND lower(email) = lower($2))
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [username.trim(), (email ?? "").trim()],
  );
  const role = rows[0]?.role;
  if (role === "admin") return "admin";
  return normalizeStaffRole(role);
}

export async function lookupAlumniClaim(accountId: string) {
  const accounts = await query<Array<{ id: string; email: string }>>(
    `SELECT id, email FROM alumni_accounts WHERE id = $1 LIMIT 1`,
    [accountId],
  );
  const account = accounts[0];
  if (!account) return { account: null, alumniId: null as string | null };

  const claims = await query<Array<{ alumni_id: string }>>(
    `SELECT alumni_id FROM alumni_claims WHERE account_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [accountId],
  );
  return { account, alumniId: claims[0]?.alumni_id ?? null };
}

export async function listCoachMessages(limit = 40) {
  await ensurePortalTables();
  return query<CoachMessage[]>(
    `
    SELECT id, title, body, author_role, author_label, created_at
    FROM coach_messages
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit],
  );
}

export async function createCoachMessage(input: {
  title?: string;
  body: string;
  authorRole: Role;
  authorLabel: string;
}) {
  await ensurePortalTables();
  const rows = await query<CoachMessage[]>(
    `
    INSERT INTO coach_messages (title, body, author_role, author_label)
    VALUES ($1, $2, $3, $4)
    RETURNING id, title, body, author_role, author_label, created_at
    `,
    [input.title?.trim() || null, input.body.trim(), input.authorRole, input.authorLabel],
  );
  return rows[0];
}

export async function listNewsflashPosts(limit = 40) {
  await ensurePortalTables();
  return query<NewsflashPost[]>(
    `
    SELECT id, title, body, event_at, author_label, created_at
    FROM newsflash_posts
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit],
  );
}

export async function createNewsflashPost(input: {
  title: string;
  body: string;
  eventAt?: string | null;
  authorLabel: string;
}) {
  await ensurePortalTables();
  const rows = await query<NewsflashPost[]>(
    `
    INSERT INTO newsflash_posts (title, body, event_at, author_label)
    VALUES ($1, $2, $3, $4)
    RETURNING id, title, body, event_at, author_label, created_at
    `,
    [input.title.trim(), input.body.trim(), input.eventAt || null, input.authorLabel],
  );
  return rows[0];
}

export async function listFundraisingCampaigns() {
  await ensurePortalTables();
  return query<FundraisingCampaign[]>(
    `
    SELECT
      c.id,
      c.title,
      c.description,
      c.goal_cents,
      c.donate_url,
      c.is_active,
      c.created_at,
      COUNT(p.id)::int AS pledge_count,
      COALESCE(SUM(p.amount_cents), 0)::int AS pledged_cents
    FROM fundraising_campaigns c
    LEFT JOIN fundraising_pledges p ON p.campaign_id = c.id
    GROUP BY c.id
    ORDER BY c.is_active DESC, c.created_at DESC
    `,
  );
}

export async function createFundraisingCampaign(input: {
  title: string;
  description?: string;
  goalCents?: number | null;
  donateUrl?: string | null;
}) {
  await ensurePortalTables();
  const rows = await query<FundraisingCampaign[]>(
    `
    INSERT INTO fundraising_campaigns (title, description, goal_cents, donate_url, is_active)
    VALUES ($1, $2, $3, $4, true)
    RETURNING id, title, description, goal_cents, donate_url, is_active, created_at,
      0::int AS pledge_count, 0::int AS pledged_cents
    `,
    [
      input.title.trim(),
      input.description?.trim() || null,
      input.goalCents ?? null,
      input.donateUrl?.trim() || null,
    ],
  );
  return rows[0];
}

export async function createFundraisingPledge(input: {
  campaignId: string;
  alumniId?: string | null;
  name?: string;
  email?: string;
  amountCents?: number | null;
  note?: string;
  source?: string;
}) {
  await ensurePortalTables();
  const rows = await query<Array<{ id: string }>>(
    `
    INSERT INTO fundraising_pledges (campaign_id, alumni_id, name, email, amount_cents, note, source)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    `,
    [
      input.campaignId,
      input.alumniId ?? null,
      input.name?.trim() || null,
      input.email?.trim() || null,
      input.amountCents ?? null,
      input.note?.trim() || null,
      input.source ?? "intent",
    ],
  );
  return rows[0];
}

export async function listAlumniLocations() {
  return query<LocationGroup[]>(
    `
    SELECT
      btrim(current_state) AS current_state,
      NULLIF(btrim(current_city), '') AS current_city,
      COUNT(*)::int AS alumni_count
    FROM alumni
    WHERE current_state IS NOT NULL AND btrim(current_state) <> ''
    GROUP BY 1, 2
    ORDER BY 1, 2
    `,
  );
}

export function toPublicAlumniCard(person: AlumniListItem): AlumniListItem {
  return {
    ...person,
    email_primary: null,
    phone_primary: null,
    address_primary: null,
  };
}
