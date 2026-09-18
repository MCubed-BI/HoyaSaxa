import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { createFundraisingCampaign } from "@/lib/portal-queries";
import { canManageFundraising } from "@/lib/roles";
import { getCurrentViewer } from "@/lib/viewer";

function dollarsToCents(value: string) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageFundraising(viewer.role)) {
    return NextResponse.redirect(new URL("/fundraising", request.url), { status: 303 });
  }

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  if (!title) {
    return NextResponse.redirect(new URL("/fundraising", request.url), { status: 303 });
  }

  try {
    await createFundraisingCampaign({
      title,
      description: String(form.get("description") ?? ""),
      goalCents: dollarsToCents(String(form.get("goal_dollars") ?? "")),
      donateUrl: String(form.get("donate_url") ?? ""),
    });
    return NextResponse.redirect(new URL("/fundraising", request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.redirect(new URL("/fundraising", request.url), { status: 303 });
    }
    throw error;
  }
}
