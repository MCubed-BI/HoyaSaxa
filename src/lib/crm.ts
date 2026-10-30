import { getSql } from "@/lib/db";
import { ensureCrmTables } from "@/lib/crm-schema";

export const CRM_NOTE_KINDS = ["note", "donation_call"] as const;
export type CrmNoteKind = (typeof CRM_NOTE_KINDS)[number];

export const CRM_OUTREACH_CHANNELS = ["sms", "email", "push"] as const;
export type CrmOutreachChannel = (typeof CRM_OUTREACH_CHANNELS)[number];

/** Recipient rows that actually left the app (Twilio / SMTP / push). Hide skipped, pending, failed. */
export const CRM_OUTREACH_SENT_STATUS = "sent";

export type CrmOutreachItem = {
  id: string;
  channel: CrmOutreachChannel;
  blastId: string;
  subject: string | null;
  body: string;
  status: string;
  address: string | null;
  provider: string | null;
  error: string | null;
  sentAt: string;
};

export function isOutgoingOutreachStatus(status: string) {
  return status.trim().toLowerCase() === CRM_OUTREACH_SENT_STATUS;
}

export type CrmNote = {
  id: string;
  alumniId: string;
  kind: CrmNoteKind;
  body: string;
  calledAt: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type CrmSnapshot = {
  alumniId: string;
  donationCallCount: number;
  outreach: CrmOutreachItem[];
  notes: CrmNote[];
};

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export function isCrmNoteKind(value: unknown): value is CrmNoteKind {
  return value === "note" || value === "donation_call";
}

export async function listCrmOutreach(alumniId: string, limit = 100): Promise<CrmOutreachItem[]> {
  await ensureCrmTables();
  const capped = Math.max(1, Math.min(limit, 300));
  const rows = await query<
    Array<{
      id: string;
      channel: CrmOutreachChannel;
      blast_id: string;
      subject: string | null;
      body: string;
      status: string;
      address: string | null;
      provider: string | null;
      error: string | null;
      sent_at: string;
    }>
  >(
    `
    (
      SELECT
        'sms:' || r.id::text AS id,
        'sms'::text AS channel,
        r.blast_id::text AS blast_id,
        NULL::text AS subject,
        b.body,
        r.status,
        r.phone AS address,
        b.provider,
        r.error,
        coalesce(r.created_at, b.created_at)::text AS sent_at
      FROM text_blast_recipients r
      JOIN text_blasts b ON b.id = r.blast_id
      WHERE r.alumni_id = $1::uuid
        AND lower(r.status) = lower($2)
    )
    UNION ALL
    (
      SELECT
        'email:' || r.id::text AS id,
        'email'::text AS channel,
        r.blast_id::text AS blast_id,
        b.subject,
        b.body,
        r.status,
        r.email AS address,
        b.provider,
        r.error,
        coalesce(r.created_at, b.created_at)::text AS sent_at
      FROM email_blast_recipients r
      JOIN email_blasts b ON b.id = r.blast_id
      WHERE r.alumni_id = $1::uuid
        AND lower(r.status) = lower($2)
    )
    UNION ALL
    (
      SELECT
        'push:' || r.id::text AS id,
        'push'::text AS channel,
        r.blast_id::text AS blast_id,
        b.title AS subject,
        b.body,
        r.status,
        r.device_token AS address,
        b.provider,
        r.error,
        coalesce(r.created_at, b.created_at)::text AS sent_at
      FROM push_blast_recipients r
      JOIN push_blasts b ON b.id = r.blast_id
      WHERE r.alumni_id = $1::uuid
        AND lower(r.status) = lower($2)
    )
    ORDER BY sent_at DESC
    LIMIT ${capped}
    `,
    [alumniId, CRM_OUTREACH_SENT_STATUS],
  );

  return rows.map((row) => ({
    id: row.id,
    channel: row.channel,
    blastId: row.blast_id,
    subject: row.subject,
    body: row.body,
    status: row.status,
    address: row.address,
    provider: row.provider,
    error: row.error,
    sentAt: row.sent_at,
  }));
}

export async function listCrmNotes(alumniId: string, limit = 100): Promise<CrmNote[]> {
  await ensureCrmTables();
  const capped = Math.max(1, Math.min(limit, 300));
  const rows = await query<
    Array<{
      id: string;
      alumni_id: string;
      kind: CrmNoteKind;
      body: string;
      called_at: string | null;
      created_by: string | null;
      created_at: string;
    }>
  >(
    `
    SELECT
      id, alumni_id, kind, body,
      called_at::text, created_by, created_at::text
    FROM alumni_crm_notes
    WHERE alumni_id = $1::uuid
    ORDER BY
      coalesce(called_at, created_at) DESC,
      created_at DESC
    LIMIT ${capped}
    `,
    [alumniId],
  );
  return rows.map((row) => ({
    id: row.id,
    alumniId: row.alumni_id,
    kind: row.kind,
    body: row.body ?? "",
    calledAt: row.called_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
}

export async function countDonationCalls(alumniId: string) {
  await ensureCrmTables();
  const rows = await query<Array<{ total: number }>>(
    `
    SELECT COUNT(*)::int AS total
    FROM alumni_crm_notes
    WHERE alumni_id = $1::uuid AND kind = 'donation_call'
    `,
    [alumniId],
  );
  return rows[0]?.total ?? 0;
}

export async function getCrmSnapshot(alumniId: string): Promise<CrmSnapshot> {
  const [outreach, notes, donationCallCount] = await Promise.all([
    listCrmOutreach(alumniId),
    listCrmNotes(alumniId),
    countDonationCalls(alumniId),
  ]);
  return { alumniId, donationCallCount, outreach, notes };
}

export async function createCrmNote(input: {
  alumniId: string;
  kind: CrmNoteKind;
  body?: string;
  calledAt?: string | null;
  createdBy?: string | null;
}): Promise<CrmNote> {
  await ensureCrmTables();
  const body = input.body?.trim() ?? "";
  if (input.kind === "note" && !body) {
    throw new Error("Write a note before saving.");
  }
  const calledAt =
    input.kind === "donation_call"
      ? input.calledAt?.trim() || new Date().toISOString()
      : null;

  const rows = await query<
    Array<{
      id: string;
      alumni_id: string;
      kind: CrmNoteKind;
      body: string;
      called_at: string | null;
      created_by: string | null;
      created_at: string;
    }>
  >(
    `
    INSERT INTO alumni_crm_notes (alumni_id, kind, body, called_at, created_by)
    VALUES ($1::uuid, $2, $3, $4::timestamptz, $5)
    RETURNING
      id, alumni_id, kind, body,
      called_at::text, created_by, created_at::text
    `,
    [
      input.alumniId,
      input.kind,
      body || (input.kind === "donation_call" ? "Donation call" : ""),
      calledAt,
      input.createdBy?.trim() || null,
    ],
  );
  const row = rows[0]!;
  return {
    id: row.id,
    alumniId: row.alumni_id,
    kind: row.kind,
    body: row.body ?? "",
    calledAt: row.called_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function deleteCrmNote(alumniId: string, noteId: string) {
  await ensureCrmTables();
  const rows = await query<Array<{ id: string }>>(
    `
    DELETE FROM alumni_crm_notes
    WHERE id = $1::uuid AND alumni_id = $2::uuid
    RETURNING id
    `,
    [noteId, alumniId],
  );
  return Boolean(rows[0]);
}
