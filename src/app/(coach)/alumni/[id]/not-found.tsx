import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function AlumniNotFound() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="directory" />
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h2 className="font-heading text-3xl text-navy">Player not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">That alumni record is not in the directory.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-navy hover:underline">
          Return to the directory
        </Link>
      </main>
    </div>
  );
}
