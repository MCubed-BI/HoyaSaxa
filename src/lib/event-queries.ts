import { isEventCategory, type EventActor, type EventCategory } from "@/lib/event-auth";
import { ensureEventTables, seedDemoEventsIfEmpty } from "@/lib/event-schema";
import type { EventListItem, EventListResult, EventTab } from "@/lib/event-types";
import { getSql } from "@/lib/db";

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  const rows = await sql.query(text, params);
  return rows as unknown as T;
}

export async function readyEventStore() {
  await ensureEventTables();
  await seedDemoEventsIfEmpty();
}

function mapEventRow(row: Record<string, unknown>, username: string): EventListItem {
  const category = isEventCategory(String(row.category)) ? (row.category as EventCategory) : "Other";
  const createdBy = String(row.created_by ?? "");
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    category,
    starts_at: row.starts_at instanceof Date ? row.starts_at.toISOString() : String(row.starts_at),
    location: typeof row.location === "string" ? row.location : null,
    thumbnail_url: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
    description: typeof row.description === "string" ? row.description : null,
    created_by: createdBy,
    created_by_role: row.created_by_role === "board" ? "board" : "coach",
    created_by_me: createdBy.toLowerCase() === username.toLowerCase(),
    rsvped: Boolean(row.rsvped),
  };
}

export async function listEvents(tab: EventTab, actor: EventActor): Promise<EventListResult> {
  await readyEventStore();
  const username = actor.username;

  const [rows, counts] = await Promise.all([
    query<Record<string, unknown>[]>(
      `
        SELECT
          e.id,
          e.title,
          e.category,
          e.starts_at,
          e.location,
          e.thumbnail_url,
          e.description,
          e.created_by,
          e.created_by_role,
          EXISTS (
            SELECT 1 FROM event_rsvps r
            WHERE r.event_id = e.id AND lower(r.attendee_key) = lower($1)
          ) AS rsvped
        FROM events e
        WHERE
          CASE
            WHEN $2 = 'upcoming' THEN e.starts_at >= now()
            WHEN $2 = 'past' THEN e.starts_at < now()
            ELSE (
              lower(e.created_by) = lower($1)
              OR EXISTS (
                SELECT 1 FROM event_rsvps r
                WHERE r.event_id = e.id AND lower(r.attendee_key) = lower($1)
              )
            )
          END
        ORDER BY
          CASE WHEN $2 = 'past' THEN e.starts_at END DESC NULLS LAST,
          CASE WHEN $2 <> 'past' THEN e.starts_at END ASC NULLS LAST
      `,
      [username, tab],
    ),
    query<Record<string, unknown>[]>(
      `
        SELECT
          count(*) FILTER (WHERE starts_at >= now())::int AS upcoming_count,
          count(*) FILTER (WHERE starts_at < now())::int AS past_count,
          count(*) FILTER (
            WHERE lower(created_by) = lower($1)
               OR id IN (
                 SELECT event_id FROM event_rsvps WHERE lower(attendee_key) = lower($1)
               )
          )::int AS mine_count
        FROM events
      `,
      [username],
    ),
  ]);

  const tally = counts[0] ?? {};
  return {
    tab,
    rows: rows.map((row) => mapEventRow(row, username)),
    upcomingCount: Number(tally.upcoming_count ?? 0),
    pastCount: Number(tally.past_count ?? 0),
    mineCount: Number(tally.mine_count ?? 0),
  };
}

export async function createEvent(input: {
  title: string;
  category: EventCategory;
  startsAt: Date;
  location: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  actor: EventActor;
}) {
  await readyEventStore();
  const rows = await query<{ id: string }[]>(
    `
      INSERT INTO events (
        title, category, starts_at, location, thumbnail_url, description, created_by, created_by_role
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
    [
      input.title,
      input.category,
      input.startsAt.toISOString(),
      input.location,
      input.thumbnailUrl,
      input.description,
      input.actor.username,
      input.actor.role,
    ],
  );
  return rows[0]?.id ?? null;
}

export async function toggleEventRsvp(eventId: string, actor: EventActor) {
  await readyEventStore();
  const existing = await query<{ id: string }[]>(
    `SELECT id FROM event_rsvps WHERE event_id = $1 AND lower(attendee_key) = lower($2) LIMIT 1`,
    [eventId, actor.username],
  );
  if (existing[0]?.id) {
    await query(`DELETE FROM event_rsvps WHERE id = $1`, [existing[0].id]);
    return { rsvped: false as const };
  }
  await query(`INSERT INTO event_rsvps (event_id, attendee_key) VALUES ($1, $2)`, [eventId, actor.username]);
  return { rsvped: true as const };
}
