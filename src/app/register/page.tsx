import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RegisterHookPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-navy px-6 py-8 text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
            Georgetown Football
          </p>
          <h1 className="mt-1 font-heading text-3xl">Register myself</h1>
          <p className="mt-2 text-sm text-white/70">
            Roster claim is owned by the Football Program branch <code>cursor/hoya-register-claim-*</code>.
          </p>
        </div>
        <div className="space-y-4 px-6 py-6 text-sm text-muted-foreground">
          <p>
            This portal does not rebuild claim. After that PR merges, this route is the last-name +
            graduating-class claim flow. Until then, preview the alumnus shell with staff username{" "}
            <strong>Alum</strong>.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/alumni-login">Alumni login hook</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Staff login</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
