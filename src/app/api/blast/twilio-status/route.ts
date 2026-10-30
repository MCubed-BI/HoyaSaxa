import { NextResponse } from "next/server";
import { ensureBlastTables } from "@/lib/blast-schema";
import { getSql } from "@/lib/db";
import { formatTwilioDeliveryError, twilioStatusToRecipientStatus } from "@/lib/sms";

export const dynamic = "force-dynamic";

/**
 * Twilio delivery StatusCallback.
 * Public (no session) — only updates rows whose provider_sid matches MessageSid.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let messageSid = "";
    let messageStatus = "";
    let errorCode = "";
    let errorMessage = "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      messageSid = String(form.get("MessageSid") ?? form.get("SmsSid") ?? "").trim();
      messageStatus = String(form.get("MessageStatus") ?? form.get("SmsStatus") ?? "").trim();
      errorCode = String(form.get("ErrorCode") ?? "").trim();
      errorMessage = String(form.get("ErrorMessage") ?? "").trim();
    } else {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      messageSid = String(body.MessageSid ?? body.SmsSid ?? "").trim();
      messageStatus = String(body.MessageStatus ?? body.SmsStatus ?? "").trim();
      errorCode = String(body.ErrorCode ?? "").trim();
      errorMessage = String(body.ErrorMessage ?? "").trim();
    }

    if (!messageSid || !messageStatus) {
      return NextResponse.json({ error: "Missing MessageSid or MessageStatus" }, { status: 400 });
    }

    await ensureBlastTables();
    const sql = getSql();
    const status = twilioStatusToRecipientStatus(messageStatus);
    const error =
      formatTwilioDeliveryError({
        status: messageStatus,
        error: errorMessage || undefined,
        errorCode: errorCode || undefined,
      }) ?? null;

    const updated = (await sql.query(
      `UPDATE text_blast_recipients
       SET status = $1, error = COALESCE($2, error)
       WHERE provider_sid = $3
       RETURNING blast_id`,
      [status, error, messageSid],
    )) as Array<{ blast_id: string }>;

    const blastId = updated[0]?.blast_id;
    if (blastId) {
      await sql.query(
        `UPDATE text_blasts SET
           sent_count = (SELECT COUNT(*)::int FROM text_blast_recipients WHERE blast_id = $1 AND status = 'sent'),
           failed_count = (SELECT COUNT(*)::int FROM text_blast_recipients WHERE blast_id = $1 AND status = 'failed'),
           status = CASE
             WHEN EXISTS (SELECT 1 FROM text_blast_recipients WHERE blast_id = $1 AND status IN ('queued', 'pending', 'sending'))
               THEN 'sending'
             WHEN (SELECT COUNT(*) FROM text_blast_recipients WHERE blast_id = $1 AND status = 'sent') = 0
               AND (SELECT COUNT(*) FROM text_blast_recipients WHERE blast_id = $1 AND status = 'failed') > 0
               THEN 'failed'
             ELSE 'sent'
           END
         WHERE id = $1`,
        [blastId],
      );
    }

    return NextResponse.json({ ok: true, updated: updated.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status callback failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
