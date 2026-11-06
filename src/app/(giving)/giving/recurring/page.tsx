import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy path — Recurring was replaced by one-time gifts. */
export default async function RecurringGivingRedirect({
  searchParams,
}: {
  searchParams: Promise<{ recorded?: string; error?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.recorded) query.set("recorded", params.recorded);
  if (params.error) query.set("error", params.error);
  const suffix = query.toString() ? `?${query}` : "";
  redirect(`/giving/one-time${suffix}`);
}
