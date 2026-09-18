import { NextResponse } from "next/server";
import { emailProvider } from "@/lib/email";
import { coerceAlumniFilters } from "@/lib/filters";
import { toE164 } from "@/lib/phone";
import { getBlastRecipients } from "@/lib/queries";
import { twilioConfigured } from "@/lib/sms";

export const dynamic = "force-dynamic";

function isEmail(value: string | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      filters?: unknown;
      ids?: string[];
      includeFilters?: boolean;
      includeIds?: boolean;
    };
    const filters = coerceAlumniFilters(body.filters);
    const rows = await getBlastRecipients({
      filters,
      ids: Array.isArray(body.ids) ? body.ids : [],
      includeFilters: Boolean(body.includeFilters),
      includeIds: Boolean(body.includeIds),
    });

    const phoneRecipients = rows.filter((row) => toE164(row.phone ?? ""));
    const emailRecipients = rows.filter((row) => isEmail(row.email));

    return NextResponse.json({
      count: rows.length,
      withPhone: phoneRecipients.length,
      withEmail: emailRecipients.length,
      missingPhone: rows.length - phoneRecipients.length,
      missingEmail: rows.length - emailRecipients.length,
      twilio: twilioConfigured(),
      emailProvider: emailProvider(),
      phoneRecipients: phoneRecipients.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
      })),
      emailRecipients: emailRecipients.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load recipients";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
