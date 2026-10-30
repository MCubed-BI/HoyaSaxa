import { NextResponse } from "next/server";
import { alumEmailBlastRejection, getBlastActor, normalizeBlastIds } from "@/lib/blast-auth";
import { ensureBlastTables } from "@/lib/blast-schema";
import { getSql } from "@/lib/db";
import {
  ALUM_EMAIL_SEND_LIMIT,
  EMAIL_SEND_LIMIT,
  buildGmailComposeLink,
  buildMailtoLink,
  gmailUser,
  isGmailAuthError,
  resolveBlastEmailProvider,
  sendProviderEmail,
} from "@/lib/email";
import { coerceAlumniFilters } from "@/lib/filters";
import { buildSmsDeepLink, toE164 } from "@/lib/phone";
import { getBlastRecipients } from "@/lib/queries";
import {
  SMS_SEND_LIMIT,
  formatTwilioDeliveryError,
  sendTwilioMessage,
  settleTwilioMessages,
  twilioA2pReady,
  twilioAuth,
  twilioConfigured,
  twilioStatusToRecipientStatus,
} from "@/lib/sms";

export const dynamic = "force-dynamic";
/** Sequential Twilio sends for up to SMS_SEND_LIMIT recipients. */
export const maxDuration = 60;

function isEmail(value: string | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

export async function POST(request: Request) {
  try {
    const actor = await getBlastActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as {
      channel?: "sms" | "email";
      message?: string;
      subject?: string;
      filters?: unknown;
      ids?: string[];
      groupIds?: string[];
      includeFilters?: boolean;
      includeIds?: boolean;
      includeGroups?: boolean;
    };
    if (actor.kind === "alum") {
      const rejection = alumEmailBlastRejection(body);
      if (rejection) {
        return NextResponse.json({ error: rejection }, { status: 403 });
      }
    }
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

    const ids = normalizeBlastIds(body.ids);
    const groupIds = actor.kind === "alum" ? [] : normalizeBlastIds(body.groupIds);
    const filters = coerceAlumniFilters(body.filters);
    const rows = await getBlastRecipients({
      filters,
      ids,
      groupIds,
      includeFilters: actor.kind === "alum" ? false : Boolean(body.includeFilters),
      includeIds: actor.kind === "alum" ? true : Boolean(body.includeIds),
      includeGroups: actor.kind === "alum" ? false : Boolean(body.includeGroups) && groupIds.length > 0,
    });

    await ensureBlastTables();
    return channel === "email"
      ? sendEmailBlast({
          rows,
          subject,
          message,
          filters,
          ids,
          groupIds,
          recipientLimit: actor.kind === "alum" ? ALUM_EMAIL_SEND_LIMIT : EMAIL_SEND_LIMIT,
        })
      : sendTextBlast({ rows, message, filters, ids, groupIds });
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
  groupIds,
}: {
  rows: Awaited<ReturnType<typeof getBlastRecipients>>;
  message: string;
  filters: unknown;
  ids: string[];
  groupIds: string[];
}) {
  const unique = new Map<string, (typeof rows)[number]>();
  const landlineSeen = new Set<string>();
  const landlines: Array<(typeof rows)[number] & { phone: string }> = [];
  for (const row of rows) {
    const e164 = row.phone ? toE164(row.phone) : null;
    if (!e164 || unique.has(e164) || landlineSeen.has(e164)) continue;
    if (row.likelyLandline) {
      landlineSeen.add(e164);
      landlines.push({ ...row, phone: e164 });
      continue;
    }
    unique.set(e164, row);
  }
  const recipients = [...unique.entries()].map(([phone, row]) => ({ ...row, phone }));

  if (recipients.length === 0) {
    return NextResponse.json(
      {
        error: landlines.length
          ? `No mobile numbers in this group. ${landlines.length} look like office/landline numbers that usually cannot receive texts.`
          : "No phone numbers in this group.",
      },
      { status: 400 },
    );
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
      JSON.stringify({ filters, ids, groupIds, skippedLandlines: landlines.length }),
    ],
  )) as Array<{ id: string }>;
  const blastId = created[0]!.id;

  for (const row of landlines) {
    await sql.query(
      `INSERT INTO text_blast_recipients (blast_id, alumni_id, name, phone, status, error)
       VALUES ($1, $2, $3, $4, 'skipped', $5)`,
      [blastId, row.id, row.name, row.phone, "Likely office/landline — SMS not sent"],
    );
  }

  // Bare From (+1 10DLC) without a Messaging Service / approved A2P campaign
  // is accepted by Twilio then undelivered with error 30034 (Danielle, Mike, etc.).
  if (twilioConfigured() && !twilioA2pReady()) {
    const from = twilioAuth()?.from ?? "your From number";
    for (const row of recipients) {
      await sql.query(
        `INSERT INTO text_blast_recipients (blast_id, alumni_id, name, phone, status, error)
         VALUES ($1, $2, $3, $4, 'skipped', $5)`,
        [
          blastId,
          row.id,
          row.name,
          row.phone,
          "Blocked: TWILIO_MESSAGING_SERVICE_SID required (A2P 30034)",
        ],
      );
    }
    await sql.query(`UPDATE text_blasts SET status = $1 WHERE id = $2`, ["failed", blastId]);
    return NextResponse.json(
      {
        error: `US text blasts need TWILIO_MESSAGING_SERVICE_SID. ${from} is not on an approved A2P 10DLC campaign, so carriers reject every message (Twilio 30034). In Twilio: create Brand + Campaign, add this number to a Messaging Service Sender Pool, then set the MG… SID on Vercel.`,
      },
      { status: 400 },
    );
  }

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
      skippedLandlines: landlines.length,
      phones,
      message,
      sms: buildSmsDeepLink(phones, message),
    });
  }

  type PendingResult = {
    name: string;
    phone: string;
    status: string;
    error?: string;
    sid?: string;
  };
  const pending: PendingResult[] = [];
  for (const row of recipients) {
    const result = await sendTwilioMessage(row.phone, message);
    pending.push({
      name: row.name,
      phone: result.phone,
      status: result.status,
      error: result.error,
      sid: result.sid,
    });
    await sql.query(
      `INSERT INTO text_blast_recipients (blast_id, alumni_id, name, phone, status, error, provider_sid)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        blastId,
        row.id,
        row.name,
        result.phone,
        result.status,
        result.error ?? null,
        result.sid ?? null,
      ],
    );
  }

  // Create returns queued/accepted — poll so we don't report "sent" when carriers never deliver
  // (Danielle's development-group text looked successful in-app but never arrived).
  const settleSids = pending.map((row) => row.sid).filter((sid): sid is string => Boolean(sid));
  const settled = await settleTwilioMessages(settleSids, {
    maxWaitMs: Math.min(20_000, Math.max(8_000, settleSids.length * 400)),
    intervalMs: 1_500,
  });

  let sent = 0;
  let failed = 0;
  let queued = 0;
  const results: PendingResult[] = [];
  for (const row of pending) {
    const update = row.sid ? settled.get(row.sid) : undefined;
    let status = row.status;
    let error = row.error;
    if (update) {
      status = twilioStatusToRecipientStatus(update.status);
      error =
        formatTwilioDeliveryError({
          status: update.status,
          error: update.error,
          errorCode: update.errorCode,
        }) ?? error;
      await sql.query(
        `UPDATE text_blast_recipients
         SET status = $1, error = $2
         WHERE blast_id = $3 AND provider_sid = $4`,
        [status, error ?? null, blastId, row.sid],
      );
    }
    if (status === "sent") sent += 1;
    else if (status === "failed") failed += 1;
    else queued += 1;
    results.push({ name: row.name, phone: row.phone, status, error, sid: row.sid });
  }

  await sql.query(`UPDATE text_blasts SET status = $1, sent_count = $2, failed_count = $3 WHERE id = $4`, [
    failed && !sent && !queued ? "failed" : queued ? "sending" : "sent",
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
    queued,
    skippedLandlines: landlines.length,
    results,
  });
}

async function sendEmailBlast({
  rows,
  subject,
  message,
  filters,
  ids,
  groupIds,
  recipientLimit,
}: {
  rows: Awaited<ReturnType<typeof getBlastRecipients>>;
  subject: string;
  message: string;
  filters: unknown;
  ids: string[];
  groupIds: string[];
  recipientLimit: number;
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
  if (recipients.length > recipientLimit) {
    return NextResponse.json(
      { error: `This group has ${recipients.length} emails. Split it under ${recipientLimit} before sending.` },
      { status: 400 },
    );
  }

  const resolved = await resolveBlastEmailProvider();
  const provider = resolved.provider;
  if (!provider && resolved.gmailError) {
    return NextResponse.json(
      {
        error: resolved.gmailError,
        channel: "email",
        mode: "gmail",
        from: gmailUser() || null,
      },
      { status: 502 },
    );
  }

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
      JSON.stringify({ filters, ids, groupIds, gmailError: resolved.gmailError ?? null }),
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
      gmail: buildGmailComposeLink(emails, subject, message),
    });
  }

  let sent = 0;
  let failed = 0;
  const results: Array<{ name: string; email: string; status: string; error?: string }> = [];
  for (const row of recipients) {
    const result = await sendProviderEmail(row.email, subject, message, provider);
    if (result.status === "sent") sent += 1;
    else failed += 1;
    results.push({ name: row.name, email: result.email, status: result.status, error: result.error });
    await sql.query(
      `INSERT INTO email_blast_recipients (blast_id, alumni_id, name, email, status, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [blastId, row.id, row.name, result.email, result.status, result.error ?? null],
    );
    // Stop after the first auth rejection so we do not repeat BadCredentials N times.
    if (result.status === "failed" && isGmailAuthError(result.error)) {
      for (const remaining of recipients.slice(results.length)) {
        failed += 1;
        results.push({
          name: remaining.name,
          email: remaining.email,
          status: "failed",
          error: result.error,
        });
        await sql.query(
          `INSERT INTO email_blast_recipients (blast_id, alumni_id, name, email, status, error)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [blastId, remaining.id, remaining.name, remaining.email, "failed", result.error ?? null],
        );
      }
      break;
    }
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
    from: provider === "gmail" ? gmailUser() : null,
    fellBackFromGmail: resolved.fellBackFromGmail ?? false,
    gmailError: resolved.gmailError ?? null,
    blastId,
    count: recipients.length,
    sent,
    failed,
    results,
  });
}
