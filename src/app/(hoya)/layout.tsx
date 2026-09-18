import { cookies } from "next/headers";
import { HoyaDirectoryHeader } from "@/components/hoya-directory-header";
import { hasAlumSessionCookie } from "@/lib/locker-session";

export default async function HoyaLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const signedIn = hasAlumSessionCookie((name) => jar.get(name)?.value);

  return (
    <div className="locker flex min-h-full flex-col">
      <HoyaDirectoryHeader signedIn={signedIn} />
      {children}
    </div>
  );
}
