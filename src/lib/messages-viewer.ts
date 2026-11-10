import { redirect } from "next/navigation";
import { getMessageViewer, loginPathFor } from "@/lib/messages-auth";

export async function requireMessageViewer(pathname = "/messages") {
  const viewer = await getMessageViewer();
  if (!viewer) {
    const login = loginPathFor(pathname);
    const next = pathname.startsWith("/") ? pathname : "/messages";
    redirect(`${login}?next=${encodeURIComponent(next)}`);
  }
  return viewer;
}
