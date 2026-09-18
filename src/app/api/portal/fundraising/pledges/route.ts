import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { createFundraisingPledge } from "@/lib/portal-queries";
import { getCurrentViewer } from "@/lib/viewer";

function dollarsToCents(value: string) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const campaignId = String(form.get("campaign_id") ?? "").trim();
  const amountCents = dollarsToCents(String(form.get("amount_dollars") ?? ""));
  if (!campaignId || !amountCents) {
    return NextResponse.redirect(new URL("/fundraising", request.url), { status: 303 });
  }

  try {
    await createFundraisingPledge({
      campaignId,
      alumniId: viewer.alumniId,
      name: String(form.get("name") ?? viewer.label),
      email: String(form.get("email") ?? viewer.email ?? ""),
      amountCents,
      note: String(form.get("note") ?? ""),
      source: "intent",
    });
    return NextResponse.redirect(new URL("/fundraising", request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.redirect(new URL("/fundraising", request.url), { status: 303 });
    }
    throw error;
  }
}
