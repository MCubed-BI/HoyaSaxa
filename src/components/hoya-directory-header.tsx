import Link from "next/link";

export function HoyaDirectoryHeader({ signedIn }: { signedIn?: boolean }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs text-muted-foreground">Hoya Football</p>
          <Link href="/directory" className="font-heading text-xl">
            Directory
          </Link>
        </div>
        {signedIn ? <p className="text-xs text-muted-foreground">Alum session</p> : null}
      </div>
    </header>
  );
}
