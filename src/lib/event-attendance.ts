/**
 * Event check-in persistence for the PR #17 `event_checkins` stub.
 * RSVP (`event_rsvps`) is not attendance. Do not add a parallel table.
 */
import { canOverrideEventCheckIn, type EventActor } from "@/lib/event-auth";
import { ensureEventTables, seedDemoEventsIfEmpty } from "@/lib/event-schema";
import { getSql } from "@/lib/db";

async function readyAttendanceStore() {
  await ensureEventTables();
  await seedDemoEventsIfEmpty();
}

export const ATTENDANCE_COUNT_SCOPE = "lifetime" as const;
export type AttendanceCountScope = typeof ATTENDANCE_COUNT_SCOPE;

export type AttendancePerson = {
  personKey: string;
  alumId: string | null;
  userId: string;
  displayName: string;
};

export type AttendanceRow = {
  id: string;
  eventId: string;
  personKey: string;
  alumId: string | null;
  userId: string;
  displayName: string;
  checkedInAt: string;
  checkedInBy: string;
  checkedInByRole: string;
  source: string;
};

export type AttendanceLeaderRow = {
  personKey: string;
  alumId: string | null;
  userId: string;
  displayName: string;
  attendanceCount: number;
  attendanceCountScope: AttendanceCountScope;
  lastCheckedInAt: string;
  rank: number;
  percentile: number;
  cohortSize: number;
};

export type CheckInAction = "insert" | "noop" | "override" | "forbidden-override";

export type CheckInResult = {
  action: Exclude<CheckInAction, "forbidden-override">;
  record: AttendanceRow;
  alreadyCheckedIn: boolean;
};

export function isEventRecordId(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

export function attendancePersonFromActor(actor: EventActor): AttendancePerson {
  const displayName = actor.username.trim() || "Guest";
  const alumId = actor.alumId?.trim() || null;
  if (alumId) {
    return {
      personKey: `alum:${alumId}`,
      alumId,
      userId: alumId,
      displayName,
    };
  }
  const userId = (actor.userId?.trim() || displayName).trim();
  return {
    personKey: `user:${userId.toLowerCase()}`,
    alumId: null,
    userId,
    displayName,
  };
}

export function attendancePersonFromStaffInput(input: {
  alumId?: string | null;
  userId?: string | null;
  displayName?: string | null;
}): AttendancePerson | null {
  const alumId = input.alumId?.trim() || null;
  const userId = input.userId?.trim() || alumId;
  if (!userId) return null;
  const displayName = input.displayName?.trim() || userId;
  if (alumId) {
    return {
      personKey: `alum:${alumId}`,
      alumId,
      userId: alumId,
      displayName,
    };
  }
  return {
    personKey: `user:${userId.toLowerCase()}`,
    alumId: null,
    userId,
    displayName,
  };
}

export function resolveCheckInAction(input: {
  existing: boolean;
  override: boolean;
  canOverride: boolean;
}): CheckInAction {
  if (!input.existing) return "insert";
  if (!input.override) return "noop";
  return input.canOverride ? "override" : "forbidden-override";
}

/**
 * Same formula as PR #17 `src/lib/badges.ts` `percentileFromRank`.
 * Rank 1 of N → 100. Coder 3 applies ≥99 Platinum, ≥90 Gold, ≥75 Silver, ≥50 Bronze.
 */
export function percentileFromRank(rank: number, population: number) {
  if (!Number.isFinite(rank) || !Number.isFinite(population) || rank < 1 || population < 1) {
    return 0;
  }
  return (1 - (rank - 1) / population) * 100;
}

export const attendancePercentile = percentileFromRank;

export function rankByCount<T extends { attendanceCount: number }>(rows: T[]) {
  const sorted = [...rows].sort((a, b) => b.attendanceCount - a.attendanceCount);
  const cohortSize = sorted.length;
  let lastCount = Number.NaN;
  let lastRank = 0;
  return sorted.map((row, index) => {
    const rank = row.attendanceCount === lastCount ? lastRank : index + 1;
    lastCount = row.attendanceCount;
    lastRank = rank;
    return {
      ...row,
      rank,
      percentile: percentileFromRank(rank, cohortSize),
      cohortSize,
    };
  });
}

function asIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function alumniIdOrNull(value: unknown) {
  return typeof value === "string" && isEventRecordId(value) ? value : null;
}

function mapAttendanceRow(row: Record<string, unknown>): AttendanceRow {
  const attendeeKey = String(row.attendee_key ?? row.person_key ?? "");
  const alumId = alumniIdOrNull(row.alumni_id ?? row.alum_id);
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    personKey: attendeeKey,
    alumId,
    userId: alumId ?? attendeeKey,
    displayName: String(row.display_name ?? attendeeKey),
    checkedInAt: asIso(row.checked_in_at),
    checkedInBy: String(row.checked_in_by ?? ""),
    checkedInByRole: String(row.checked_in_by_role ?? ""),
    source: String(row.source ?? "self"),
  };
}

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export async function getEventById(eventId: string) {
  await readyAttendanceStore();
  const rows = await query<Record<string, unknown>[]>(
    `
      SELECT id, title, category, starts_at, location, thumbnail_url, description, created_by, created_by_role
      FROM events
      WHERE id = $1
      LIMIT 1
    `,
    [eventId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    category: String(row.category ?? "Other"),
    startsAt: asIso(row.starts_at),
    location: typeof row.location === "string" ? row.location : null,
    thumbnailUrl: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
    description: typeof row.description === "string" ? row.description : null,
    createdBy: String(row.created_by ?? ""),
    createdByRole: row.created_by_role === "board" ? ("board" as const) : ("coach" as const),
  };
}

export async function getAttendanceRecord(eventId: string, personKey: string) {
  await readyAttendanceStore();
  const rows = await query<Record<string, unknown>[]>(
    `SELECT * FROM event_checkins WHERE event_id = $1 AND attendee_key = $2 LIMIT 1`,
    [eventId, personKey],
  );
  return rows[0] ? mapAttendanceRow(rows[0]) : null;
}

export async function listEventAttendance(eventId: string) {
  await readyAttendanceStore();
  const rows = await query<Record<string, unknown>[]>(
    `
      SELECT *
      FROM event_checkins
      WHERE event_id = $1
      ORDER BY checked_in_at ASC
    `,
    [eventId],
  );
  return rows.map(mapAttendanceRow);
}

export async function listAttendanceLeaders(limit = 50): Promise<AttendanceLeaderRow[]> {
  await readyAttendanceStore();
  const rows = await query<Record<string, unknown>[]>(
    `
      SELECT
        attendee_key,
        alumni_id,
        display_name,
        COUNT(*)::int AS attendance_count,
        MAX(checked_in_at) AS last_checked_in_at
      FROM event_checkins
      GROUP BY attendee_key, alumni_id, display_name
    `,
  );
  return rankByCount(
    rows.map((row) => ({
      personKey: String(row.attendee_key ?? ""),
      alumId: alumniIdOrNull(row.alumni_id),
      userId: alumniIdOrNull(row.alumni_id) ?? String(row.attendee_key ?? ""),
      displayName: String(row.display_name ?? row.attendee_key ?? ""),
      attendanceCount: Number(row.attendance_count ?? 0),
      attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
      lastCheckedInAt: asIso(row.last_checked_in_at),
    })),
  ).slice(0, limit);
}

export async function lifetimeAttendanceCount(personKey: string) {
  await readyAttendanceStore();
  const rows = await query<Array<{ attendance_count: number }>>(
    `SELECT COUNT(*)::int AS attendance_count FROM event_checkins WHERE attendee_key = $1`,
    [personKey],
  );
  return Number(rows[0]?.attendance_count ?? 0);
}

export async function checkInToEvent(input: {
  eventId: string;
  actor: EventActor;
  person?: AttendancePerson | null;
  override?: boolean;
}): Promise<CheckInResult> {
  await readyAttendanceStore();
  const event = await getEventById(input.eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  const staffPerson = input.person && canOverrideEventCheckIn(input.actor.role) ? input.person : null;
  const person = staffPerson ?? attendancePersonFromActor(input.actor);
  const override = Boolean(input.override);
  const canOverride = canOverrideEventCheckIn(input.actor.role);
  const existing = await getAttendanceRecord(input.eventId, person.personKey);
  const action = resolveCheckInAction({
    existing: Boolean(existing),
    override,
    canOverride,
  });

  if (action === "forbidden-override") {
    throw new Error("Staff override is required to update an existing check-in.");
  }

  if (action === "noop" && existing) {
    return { action, record: existing, alreadyCheckedIn: true };
  }

  const source = staffPerson ? (action === "override" ? "staff_override" : "staff") : "self";

  if (action === "override") {
    const rows = await query<Record<string, unknown>[]>(
      `
        UPDATE event_checkins
        SET
          alumni_id = $3,
          display_name = $4,
          checked_in_at = now(),
          checked_in_by = $5,
          source = $6
        WHERE event_id = $1 AND attendee_key = $2
        RETURNING *
      `,
      [
        input.eventId,
        person.personKey,
        alumniIdOrNull(person.alumId),
        person.displayName,
        input.actor.username,
        source,
      ],
    );
    const record = rows[0] ? mapAttendanceRow(rows[0]) : existing;
    if (!record) throw new Error("Could not update check-in.");
    return { action, record, alreadyCheckedIn: true };
  }

  const rows = await query<Record<string, unknown>[]>(
    `
      INSERT INTO event_checkins (
        event_id, alumni_id, attendee_key, display_name, checked_in_by, source
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (event_id, attendee_key) WHERE attendee_key IS NOT NULL DO NOTHING
      RETURNING *
    `,
    [
      input.eventId,
      alumniIdOrNull(person.alumId),
      person.personKey,
      person.displayName,
      input.actor.username,
      source,
    ],
  );

  const inserted = rows[0] ? mapAttendanceRow(rows[0]) : await getAttendanceRecord(input.eventId, person.personKey);
  if (!inserted) throw new Error("Could not save check-in.");
  return {
    action: rows[0] ? "insert" : "noop",
    record: inserted,
    alreadyCheckedIn: !rows[0],
  };
}
