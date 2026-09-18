import Link from "next/link";

export default function MessageChannelNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <h2 className="font-heading text-3xl text-navy">Channel not found</h2>
      <p className="mt-2 text-sm text-muted-foreground">That message channel is not available.</p>
      <Link href="/messages" className="mt-4 inline-block text-sm text-navy hover:underline">
        Back to Messages
      </Link>
    </main>
  );
}
