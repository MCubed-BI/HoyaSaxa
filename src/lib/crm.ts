import { ensureBlastTables } from "@/lib/blast-schema";
import { ensureContactNotesTable } from "@/lib/crm-schema";
import { getSql } from "@/lib/db";

export const CONTACT_NOTE_KINDS = ["donation_call", "note"] as const;
export type ContactNoteKind = (typeof CONTACT_NOTE_KINDS)[number];

export const CRM_CHANNELS = ["text", "email", "push"] as const;
export type CrmChannel = (typeof CRM_CHANNELS)[number];

export type CrmCommunication = {
  id: string;
  channel: CrmChannel;
  blast_id: string;
  subject: string | null;
  body: string;
  destination: string;
  status: string;
  error: string | null;
  blast_status: string;
  provider: string | null;
  created_at: string;
};

export type ContactNote = {
  id: string;
  alumni_id: string;
  kind: ContactNoteKind;
  body: string;
  created_by: string | null;
  created_at: string;
};

export type ContactCrmSummary = {
  communications: CrmCommunication[];
  notes: ContactNote[];
  donation_call_count: number;
};

const MAX_NOTE_BODY = 4000;

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export function isContactNoteKind(value: unknown): value is ContactNoteKind {
  return typeof value === "string" && (CONTACT_NOTE_KINDS as readonly string[]).includes(value);
}

export function normalizeContactNoteKind(value: unknown): ContactNoteKind {
  if (isContactNoteKind(value)) return value;
  return "donation_call";
}

export function channelLabel(channel: CrmChannel) {
  if (channel === "text") return "Text";
  if (channel === "email") return "Email";
  return "Push";
}

export function noteKindLabel(kind: ContactNoteKind) {
  return kind === "donation_call" ? "Donation call" : "Note";
}

export function truncateSnippet(value: string, max = 140) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export async function listContactCommunications(
  alumniId: string,
  limit = 100,
): Promise<CrmCommunication[]> {
  await ensureBlastTables();
  const capped = Math.min(Math.max(1, limit), 500);
  return query<CrmCommunication[]>(
    `
    SELECT * FROM (
      SELECT
        'text:' || r.id::text AS id,
        'text'::text AS channel,
        b.id::text AS blast_id,
        NULL::text AS subject,
        b.body,
        r.phone AS destination,
        r.status,
        r.error,
        b.status AS blast_status,
        b.provider,
        r.created_at::text AS created_at
      FROM text_blast_recipients r
      JOIN text_blasts b ON b.id = r.blast_id
      WHERE r.alumni_id = $1

      UNION ALL

      SELECT
        'email:' || r.id::text AS id,
        'email'::text AS channel,
        b.id::text AS blast_id,
        b.subject,
        b.body,
        r.email AS destination,
        r.status,
        r.error,
        b.status AS blast_status,
        b.provider,
        r.created_at::text AS created_at
      FROM email_blast_recipients r
      JOIN email_blasts b ON b.id = r.blast_id
      WHERE r.alumni_id = $1
    ) AS communications
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [alumniId, capped],
  );
}

export async function listContactNotes(
  alumniId: string,
  options: { kind?: ContactNoteKind; limit?: number } = {},
): Promise<ContactNote[]> {
  await ensureContactNotesTable();
  const capped = Math.min(Math.max(1, options.limit ?? 100), 500);
  if (options.kind) {
    return query<ContactNote[]>(
      `
      SELECT id, alumni_id, kind, body, created_by, created_at::text AS created_at
      FROM contact_notes
      WHERE alumni_id = $1 AND kind = $2
      ORDER BY created_at DESC
      LIMIT $3
      `,
      [alumniId, options.kind, capped],
    );
  }
  return query<ContactNote[]>(
    `
    SELECT id, alumni_id, kind, body, created_by, created_at::text AS created_at
    FROM contact_notes
    WHERE alumni_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [alumniId, capped],
  );
}

export async function countDonationCalls(alumniId: string): Promise<number> {
  await ensureContactNotesTable();
  const rows = await query<Array<{ count: number }>>(
    `
    SELECT COUNT(*)::int AS count
    FROM contact_notes
    WHERE alumni_id = $1 AND kind = 'donation_call'
    `,
    [alumniId],
  );
  return rows[0]?.count ?? 0;
}

export async function getContactCrmSummary(alumniId: string): Promise<ContactCrmSummary> {
  const [communications, notes, donation_call_count] = await Promise.all([
    listContactCommunications(alumniId),
    listContactNotes(alumniId),
    countDonationCalls(alumniId),
  ]);
  return { communications, notes, donation_call_count };
}

export async function createContactNote(input: {
  alumniId: string;
  kind?: ContactNoteKind | string;
  body: string;
  createdBy?: string | null;
}): Promise<ContactNote> {
  await ensureContactNotesTable();
  const body = input.body.trim().slice(0, MAX_NOTE_BODY);
  if (!body) throw new Error("Note body is required.");
  const kind = normalizeContactNoteKind(input.kind);
  const createdBy = input.createdBy?.trim() || null;
  const rows = await query<ContactNote[]>(
    `
    INSERT INTO contact_notes (alumni_id, kind, body, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id, alumni_id, kind, body, created_by, created_at::text AS created_at
    `,
    [input.alumniId, kind, body, createdBy],
  );
  const note = rows[0];
  if (!note) throw new Error("Could not save note.");
  return note;
}

/** Remap CRM notes when merging alumni records. */
export async function remapContactNotesAlumniId(keeperId: string, sourceId: string) {
  await ensureContactNotesTable();
  await query(`UPDATE contact_notes SET alumni_id = $1 WHERE alumni_id = $2`, [keeperId, sourceId]);
}
