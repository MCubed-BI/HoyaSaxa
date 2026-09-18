import Link from "next/link";

export default function AthleteNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <h1 className="font-heading text-2xl">Profile not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That directory card is not in the roster.</p>
      <Link href="/directory" className="mt-4 inline-block text-sm hover:underline">
        Back to directory
      </Link>
    </main>
  );
}
