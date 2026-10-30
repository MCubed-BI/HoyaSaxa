import { NextResponse } from "next/server";
import { alumEmailBlastRejection, getBlastActor, normalizeBlastIds } from "@/lib/blast-auth";
import { emailProvider } from "@/lib/email";
import { coerceAlumniFilters } from "@/lib/filters";
import { getBlastRecipients } from "@/lib/queries";
import { twilioConfigured } from "@/lib/sms";

export const dynamic = "force-dynamic";

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
      channel?: string;
      filters?: unknown;
      ids?: string[];
      groupIds?: string[];
      includeFilters?: boolean;
      includeIds?: boolean;
      includeGroups?: boolean;
    };
    if (actor.kind === "alum") {
      const rejection = alumEmailBlastRejection({ ...body, channel: "email" }, { preview: true });
      if (rejection) {
        return NextResponse.json({ error: rejection }, { status: 403 });
      }
    }
    const filters = coerceAlumniFilters(body.filters);
    const groupIds = actor.kind === "alum" ? [] : normalizeBlastIds(body.groupIds);
    const rows = await getBlastRecipients({
      filters,
      ids: normalizeBlastIds(body.ids),
      groupIds,
      includeFilters: actor.kind === "alum" ? false : Boolean(body.includeFilters),
      includeIds: actor.kind === "alum" ? true : Boolean(body.includeIds),
      includeGroups: actor.kind === "alum" ? false : Boolean(body.includeGroups) && groupIds.length > 0,
    });

    const withAnyPhone = rows.filter((row) => row.phone);
    const phoneRecipients = withAnyPhone.filter((row) => !row.likelyLandline);
    const landlineRecipients = withAnyPhone.filter((row) => row.likelyLandline);
    const emailRecipients = rows.filter((row) => isEmail(row.email));

    return NextResponse.json({
      count: rows.length,
      withPhone: phoneRecipients.length,
      withLandline: landlineRecipients.length,
      withEmail: emailRecipients.length,
      missingPhone: rows.length - withAnyPhone.length,
      missingEmail: rows.length - emailRecipients.length,
      twilio: twilioConfigured(),
      emailProvider: emailProvider(),
      phoneRecipients: phoneRecipients.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        phoneLabel: row.phoneLabel ?? null,
        phoneKind: row.phoneKind ?? null,
        email: row.email,
      })),
      landlineRecipients: landlineRecipients.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        phoneLabel: row.phoneLabel ?? null,
        phoneKind: row.phoneKind ?? null,
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
