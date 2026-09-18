import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AlumniMePanel } from "@/components/alumni-me-panel";
import { Button } from "@/components/ui/button";
import { accountIdFromCookies, findSameLastNameCandidates, getAccountById, getClaimedRecords } from "@/lib/alumni-claim";
import { isMissingDatabaseConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const jar = await cookies();
  const accountId = await accountIdFromCookies(jar);
  if (!accountId) redirect("/alumni-login?next=/me");

  try {
    const account = await getAccountById(accountId);
    if (!account) redirect("/alumni-login?next=/me");
    const records = await getClaimedRecords(accountId);
    const lastName = records[0]?.last_name ?? "";
    const mergeCandidates = lastName
      ? await findSameLastNameCandidates(
          lastName,
          accountId,
          records.map((row) => row.id),
        )
      : [];

    return (
      <div className="flex min-h-full flex-col">
        <header className="border-b border-white/10 bg-navy text-navy-foreground">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
                Georgetown Football
              </p>
              <h1 className="font-heading text-xl tracking-tight text-white sm:text-2xl">My alumni record</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/register" className="text-sm text-white/75 hover:text-white">
                Register another
              </Link>
              <form action="/api/alumni/logout" method="post">
                <Button
                  type="submit"
                  variant="ghost"
                  className="h-8 px-3 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
          <p className="text-sm text-muted-foreground">
            Alumni can edit their own contact record or merge a duplicate roster row. This login does not open the
            coach directory.
          </p>
          <AlumniMePanel email={account.email} records={records} mergeCandidates={mergeCandidates} />
        </main>
      </div>
    );
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return (
        <main className="mx-auto w-full max-w-4xl px-4 py-12">
          <h1 className="font-heading text-2xl text-navy">Database is not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">Set DATABASE_URL and reload.</p>
        </main>
      );
    }
    throw error;
  }
}
