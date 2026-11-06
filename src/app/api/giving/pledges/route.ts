import { NextResponse } from "next/server";
import { isPreviewAlumSession, readAlumSessionFromCookies } from "@/lib/alum-session";
import { isAlumniUuid } from "@/lib/badge-event-feed";
import { loadAlumniNameIndex, resolveAlumniIdFromLabel } from "@/lib/badge-identity";
import { isMissingDatabaseConfig } from "@/lib/db";
import {
  createGivingPledge,
  listGivingSummary,
  normalizeDonorLabel,
  resolveGivingPledgeInput,
} from "@/lib/giving";
import { getCurrentViewer } from "@/lib/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function readBodyFields(body: Record<string, unknown>) {
  return {
    amountDollars: body.amountDollars ?? body.amount_dollars,
    amountCents: body.amountCents ?? body.amount_cents,
    designation: body.designation,
    jacketVariant: body.jacketVariant ?? body.jacket_variant,
    suitSize: body.suitSize ?? body.suit_size,
    tailgateTheme: body.tailgateTheme ?? body.tailgate_theme,
    tailgateGame: body.tailgateGame ?? body.tailgate_game,
    tailgateMode: body.tailgateMode ?? body.tailgate_mode,
    donorLabel: body.donorLabel ?? body.donor_label,
    alumniId: body.alumniId ?? body.alumni_id,
  };
}

export async function GET() {
  try {
    const summary = await listGivingSummary();
    return NextResponse.json(summary);
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return jsonError("DATABASE_URL is not set.", 503);
    }
    const message = error instanceof Error ? error.message : "Could not load pledges.";
    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const parsed = (await request.json()) as unknown;
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } else {
      const form = await request.formData();
      body = {
        amountDollars: form.get("amountDollars") ?? form.get("amount_dollars"),
        amountCents: form.get("amountCents") ?? form.get("amount_cents"),
        donorLabel: form.get("donorLabel") ?? form.get("donor_label"),
        designation: form.get("designation"),
        jacketVariant: form.get("jacketVariant") ?? form.get("jacket_variant"),
        suitSize: form.get("suitSize") ?? form.get("suit_size"),
        tailgateTheme: form.get("tailgateTheme") ?? form.get("tailgate_theme"),
        tailgateGame: form.get("tailgateGame") ?? form.get("tailgate_game"),
        tailgateMode: form.get("tailgateMode") ?? form.get("tailgate_mode"),
      };
    }
  } catch {
    return jsonError("Could not read pledge payload.", 400);
  }

  const fields = readBodyFields(body);
  const resolved = resolveGivingPledgeInput(fields);
  const wantsJson = contentType.includes("application/json");

  function redirectForPiece(query: "recorded=1" | "error=amount") {
    const designation = resolved.ok ? resolved.designation : String(fields.designation ?? "recurring");
    const path =
      designation === "letterman_jacket"
        ? "/giving/letterman"
        : designation === "tailgate"
          ? "/giving/tailgate"
          : "/giving/recurring";
    return NextResponse.redirect(new URL(`${path}?${query}`, request.url), { status: 303 });
  }

  if (!resolved.ok) {
    if (!wantsJson) {
      return redirectForPiece("error=amount");
    }
    return jsonError(resolved.error, 400);
  }

  try {
    const session = await readAlumSessionFromCookies();
    const viewer = await getCurrentViewer().catch(() => null);
    const alumni = await loadAlumniNameIndex().catch(() => []);
    const donorLabel = normalizeDonorLabel(fields.donorLabel);
    const fromSession = session && !isPreviewAlumSession(session) ? session.alumniId : null;
    const fromBody = typeof fields.alumniId === "string" ? fields.alumniId.trim() : "";
    const fromLabel = donorLabel ? resolveAlumniIdFromLabel(donorLabel, alumni) : "";
    const fromViewer =
      !donorLabel && viewer
        ? resolveAlumniIdFromLabel(viewer.username || viewer.label || "", alumni)
        : "";
    const alumniId =
      fromSession || (isAlumniUuid(fromBody) ? fromBody : "") || fromLabel || fromViewer || null;
    const pledge = await createGivingPledge({
      amountCents: resolved.amountCents,
      donorLabel,
      alumniId,
      designation: resolved.designation,
      details: resolved.details,
    });
    if (!wantsJson) {
      return redirectForPiece("recorded=1");
    }
    const summary = await listGivingSummary();
    return NextResponse.json({ pledge, ...summary }, { status: 201 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return jsonError("DATABASE_URL is not set.", 503);
    }
    const message = error instanceof Error ? error.message : "Could not save pledge.";
    return jsonError(message, 500);
  }
}
