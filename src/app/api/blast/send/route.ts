import { NextResponse } from "next/server";
import { ensureBlastTables } from "@/lib/blast-schema";
import { getSql } from "@/lib/db";
import { EMAIL_SEND_LIMIT, buildMailtoLink, emailProvider, sendProviderEmail } from "@/lib/email";
import { coerceAlumniFilters } from "@/lib/filters";
import { buildSmsDeepLink, toE164 } from "@/lib/phone";
import { getBlastRecipients } from "@/lib/queries";
import { SMS_SEND_LIMIT, sendTwilioMessage, twilioConfigured } from "@/lib/sms";

export const dynamic = "force-dynamic";

function isEmail(value: string | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      channel?: "sms" | "email";
      message?: string;
      subject?: string;
      filters?: unknown;
      ids?: string[];
      includeFilters?: boolean;
      includeIds?: boolean;
    };
    const channel = body.channel === "email" ? "email" : "sms";
    const message = body.message?.trim() ?? "";
    const subject = body.subject?.trim() ?? "";
    if (!message) {
      return NextResponse.json({ error: "Write a message before sending." }, { status: 400 });
    }
    if (channel === "email" && !subject) {
      return NextResponse.json({ error: "Add a subject before sending email." }, { status: 400 });
    }
    if (channel === "sms" && message.length > 1600) {
      return NextResponse.json({ error: "Message is too long (1,600 character max)." }, { status: 400 });
    }
    if (channel === "email" && message.length > 20000) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    const filters = coerceAlumniFilters(body.filters);
    const rows = await getBlastRecipients({
      filters,
      ids: Array.isArray(body.ids) ? body.ids : [],
      includeFilters: Boolean(body.includeFilters),
      includeIds: Boolean(body.includeIds),
    });

    await ensureBlastTables();
    return channel === "email"
      ? sendEmailBlast({ rows, subject, message, filters, ids: body.ids ?? [] })
      : sendTextBlast({ rows, message, filters, ids: body.ids ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Blast failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function sendTextBlast({
  rows,
  message,
  filters,
  ids,
}: {
  rows: Awaited<ReturnType<typeof getBlastRecipients>>;
  message: string;
  filters: unknown;
  ids: string[];
}) {
  const unique = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const e164 = row.phone ? toE164(row.phone) : null;
    if (!e164 || unique.has(e164)) continue;
    unique.set(e164, row);
  }
  const recipients = [...unique.entries()].map(([phone, row]) => ({ ...row, phone }));

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No phone numbers in this group." }, { status: 400 });
  }
  if (recipients.length > SMS_SEND_LIMIT) {
    return NextResponse.json(
      { error: `This group has ${recipients.length} numbers. Split it under ${SMS_SEND_LIMIT} before sending.` },
      { status: 400 },
    );
  }

  const sql = getSql();
  const created = (await sql.query(
    `INSERT INTO text_blasts (body, status, provider, recipient_count, filter_snapshot)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id`,
    [
      message,
      twilioConfigured() ? "sending" : "fallback",
      twilioConfigured() ? "twilio" : "fallback",
      recipients.length,
      JSON.stringify({ filters, ids }),
    ],
  )) as Array<{ id: string }>;
  const blastId = created[0]!.id;

  if (!twilioConfigured()) {
    for (const row of recipients) {
      await sql.query(
        `INSERT INTO text_blast_recipients (blast_id, alumni_id, name, phone, status)
         VALUES ($1, $2, $3, $4, 'skipped')`,
        [blastId, row.id, row.name, row.phone],
      );
    }
    const phones = recipients.map((row) => row.phone);
    return NextResponse.json({
      channel: "sms",
      mode: "fallback",
      blastId,
      count: recipients.length,
      phones,
      message,
      sms: buildSmsDeepLink(phones, message),
    });
  }

  let sent = 0;
  let failed = 0;
  const results: Array<{ name: string; phone: string; status: string; error?: string }> = [];
  for (const row of recipients) {
    const result = await sendTwilioMessage(row.phone, message);
    if (result.status === "sent") sent += 1;
    else failed += 1;
    results.push({ name: row.name, phone: result.phone, status: result.status, error: result.error });
    await sql.query(
      `INSERT INTO text_blast_recipients (blast_id, alumni_id, name, phone, status, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [blastId, row.id, row.name, result.phone, result.status, result.error ?? null],
    );
  }

  await sql.query(`UPDATE text_blasts SET status = $1, sent_count = $2, failed_count = $3 WHERE id = $4`, [
    failed && !sent ? "failed" : "sent",
    sent,
    failed,
    blastId,
  ]);

  return NextResponse.json({
    channel: "sms",
    mode: "twilio",
    blastId,
    count: recipients.length,
    sent,
    failed,
    results,
  });
}

async function sendEmailBlast({
  rows,
  subject,
  message,
  filters,
  ids,
}: {
  rows: Awaited<ReturnType<typeof getBlastRecipients>>;
  subject: string;
  message: string;
  filters: unknown;
  ids: string[];
}) {
  const unique = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase() ?? "";
    if (!isEmail(email) || unique.has(email)) continue;
    unique.set(email, row);
  }
  const recipients = [...unique.entries()].map(([email, row]) => ({ ...row, email }));

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No email addresses in this group." }, { status: 400 });
  }
  if (recipients.length > EMAIL_SEND_LIMIT) {
    return NextResponse.json(
      { error: `This group has ${recipients.length} emails. Split it under ${EMAIL_SEND_LIMIT} before sending.` },
      { status: 400 },
    );
  }

  const provider = emailProvider();
  const sql = getSql();
  const created = (await sql.query(
    `INSERT INTO email_blasts (subject, body, status, provider, recipient_count, filter_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id`,
    [
      subject,
      message,
      provider ? "sending" : "fallback",
      provider ?? "fallback",
      recipients.length,
      JSON.stringify({ filters, ids }),
    ],
  )) as Array<{ id: string }>;
  const blastId = created[0]!.id;
  const emails = recipients.map((row) => row.email);

  if (!provider) {
    for (const row of recipients) {
      await sql.query(
        `INSERT INTO email_blast_recipients (blast_id, alumni_id, name, email, status)
         VALUES ($1, $2, $3, $4, 'skipped')`,
        [blastId, row.id, row.name, row.email],
      );
    }
    return NextResponse.json({
      channel: "email",
      mode: "fallback",
      blastId,
      count: recipients.length,
      emails,
      subject,
      message,
      mailto: buildMailtoLink(emails, subject, message),
    });
  }

  let sent = 0;
  let failed = 0;
  const results: Array<{ name: string; email: string; status: string; error?: string }> = [];
  for (const row of recipients) {
    const result = await sendProviderEmail(row.email, subject, message);
    if (result.status === "sent") sent += 1;
    else failed += 1;
    results.push({ name: row.name, email: result.email, status: result.status, error: result.error });
    await sql.query(
      `INSERT INTO email_blast_recipients (blast_id, alumni_id, name, email, status, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [blastId, row.id, row.name, result.email, result.status, result.error ?? null],
    );
  }

  await sql.query(`UPDATE email_blasts SET status = $1, sent_count = $2, failed_count = $3 WHERE id = $4`, [
    failed && !sent ? "failed" : "sent",
    sent,
    failed,
    blastId,
  ]);

  return NextResponse.json({
    channel: "email",
    mode: provider,
    blastId,
    count: recipients.length,
    sent,
    failed,
    results,
  });
}
