import { NextResponse } from "next/server";
import { isPreviewAlumSession, readAlumSessionFromCookies } from "@/lib/alum-session";
import { isAlumniUuid } from "@/lib/badge-event-feed";
import { loadAlumniNameIndex, resolveAlumniIdFromLabel } from "@/lib/badge-identity";
import { isMissingDatabaseConfig } from "@/lib/db";
import {
  MAX_PLEDGE_CENTS,
  MIN_PLEDGE_CENTS,
  createGivingPledge,
  dollarsToCents,
  listGivingSummary,
  normalizeDonorLabel,
} from "@/lib/giving";
import { getCurrentViewer } from "@/lib/viewer";

function parseAmountCents(body: Record<string, unknown>): number | null {
  const fromDollars = dollarsToCents(body.amountDollars ?? body.amount_dollars);
  if (fromDollars !== null) return fromDollars;
  const raw = body.amountCents ?? body.amount_cents;
  const cents = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw) : null;
  if (cents === null || !Number.isInteger(cents) || cents < MIN_PLEDGE_CENTS || cents > MAX_PLEDGE_CENTS) {
    return null;
  }
  return cents;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
      };
    }
  } catch {
    return jsonError("Could not read pledge payload.", 400);
  }

  const amountCents = parseAmountCents(body);

  if (amountCents === null) {
    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL("/giving?error=amount", request.url), { status: 303 });
    }
    return jsonError("Choose a valid impact amount of at least $1.", 400);
  }

  const wantsJson = contentType.includes("application/json");

  try {
    const session = await readAlumSessionFromCookies();
    const viewer = await getCurrentViewer().catch(() => null);
    const alumni = await loadAlumniNameIndex().catch(() => []);
    const donorLabel = normalizeDonorLabel(body.donorLabel ?? body.donor_label);
    const fromSession = session && !isPreviewAlumSession(session) ? session.alumniId : null;
    const fromBody = typeof body.alumniId === "string" ? body.alumniId.trim() : "";
    const fromLabel = donorLabel ? resolveAlumniIdFromLabel(donorLabel, alumni) : "";
    const fromViewer =
      !donorLabel && viewer
        ? resolveAlumniIdFromLabel(viewer.username || viewer.label || "", alumni)
        : "";
    const alumniId =
      fromSession || (isAlumniUuid(fromBody) ? fromBody : "") || fromLabel || fromViewer || null;
    const pledge = await createGivingPledge({
      amountCents,
      donorLabel,
      alumniId,
    });
    if (!wantsJson) {
      return NextResponse.redirect(new URL("/giving?recorded=1", request.url), { status: 303 });
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
