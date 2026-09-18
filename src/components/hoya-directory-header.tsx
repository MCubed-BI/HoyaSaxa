import Link from "next/link";

export function HoyaDirectoryHeader({ signedIn }: { signedIn?: boolean }) {
  return (
    <header className="border-b border-gold/30 bg-navy text-navy-foreground">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold">Hoya Football</p>
          <Link href="/directory" className="font-heading text-xl text-white sm:text-2xl">
            Legacy Locker
          </Link>
        </div>
        {signedIn ? <p className="text-xs text-gold/80">Alum session</p> : null}
      </div>
    </header>
  );
}
